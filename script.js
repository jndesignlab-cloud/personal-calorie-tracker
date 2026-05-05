const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwx4Xy73BwQcdEAeHqdKMdiMG5ZhtCJOLDrx_VR7O8LWVHXw1LICkLc_6ZuRcy8ukYT1g/exec";

const foodDatabase = [
  { name: "Rice", keywords: ["rice", "white rice", "kanin"], calories: 200, unit: "serving" },
  { name: "Egg", keywords: ["egg", "eggs", "boiled egg", "fried egg"], calories: 70, unit: "piece" },
  { name: "Fried Chicken", keywords: ["fried chicken", "chickenjoy"], calories: 350, unit: "piece" },
  { name: "Chicken", keywords: ["chicken"], calories: 250, unit: "serving" },
  { name: "Hotdog", keywords: ["hotdog", "hot dog"], calories: 150, unit: "piece" },
  { name: "Iced Coffee", keywords: ["iced coffee"], calories: 180, unit: "cup" },
  { name: "Coffee", keywords: ["coffee"], calories: 80, unit: "cup" },
  { name: "Milk Tea", keywords: ["milk tea", "milktea"], calories: 350, unit: "cup" },
  { name: "Pork Adobo", keywords: ["pork adobo", "adobong baboy"], calories: 350, unit: "serving" },
  { name: "Chicken Adobo", keywords: ["chicken adobo", "adobong manok"], calories: 300, unit: "serving" },
  { name: "Pancit", keywords: ["pancit", "pansit"], calories: 350, unit: "serving" },
  { name: "Lumpia", keywords: ["lumpia"], calories: 90, unit: "piece" },
  { name: "Siomai", keywords: ["siomai"], calories: 70, unit: "piece" }
];

let entries = JSON.parse(localStorage.getItem("calorieEntries")) || [];

const dateInput = document.getElementById("dateInput");
const goalInput = document.getElementById("goalInput");
const mealInput = document.getElementById("mealInput");
const foodInput = document.getElementById("foodInput");
const calorieInput = document.getElementById("calorieInput");
const notesInput = document.getElementById("notesInput");
const entriesList = document.getElementById("entriesList");
const consumedCalories = document.getElementById("consumedCalories");
const remainingCalories = document.getElementById("remainingCalories");
const remainingLabel = document.getElementById("remainingLabel");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progressBar");

dateInput.valueAsDate = new Date();

async function estimateCalories() {
  const foodText = foodInput.value.trim();

  if (!foodText) {
    alert("Please enter your food intake first.");
    return;
  }

  calorieInput.value = "";
  notesInput.value = "Estimating with API Ninjas...";

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "estimate",
        food: foodText
      })
    });

    const data = await response.json();

    if (data.status === "success") {
      calorieInput.value = data.totalCalories;

      const breakdownText = data.breakdown.map(item => {
        return `${item.name}: ${item.calories} kcal`;
      }).join("; ");

      notesInput.value = `API Estimate: ${breakdownText}`;
      return;
    }

    fallbackEstimate(foodText);

  } catch (error) {
    fallbackEstimate(foodText);
  }
}

function fallbackEstimate(foodText) {
  const items = foodText
    .toLowerCase()
    .replace(/\band\b/g, ",")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);

  let total = 0;
  let breakdown = [];

  items.forEach(itemText => {
    let matchedFood = null;

    foodDatabase.forEach(food => {
      food.keywords.forEach(keyword => {
        if (itemText.includes(keyword)) {
          matchedFood = food;
        }
      });
    });

    if (matchedFood) {
      const quantity = getQuantity(itemText);
      const itemCalories = matchedFood.calories * quantity;
      total += itemCalories;
      breakdown.push(`${quantity} ${matchedFood.unit} ${matchedFood.name} = ${itemCalories} kcal`);
    }
  });

  calorieInput.value = total || 0;

  notesInput.value = breakdown.length > 0
    ? `Fallback Estimate: ${breakdown.join("; ")}`
    : "No API or local match found. Please enter calories manually.";
}

function getQuantity(text) {
  const numberMatch = text.match(/\d+(\.\d+)?/);

  if (numberMatch) return parseFloat(numberMatch[0]);
  if (text.includes("half")) return 0.5;
  if (text.includes("one")) return 1;
  if (text.includes("two")) return 2;
  if (text.includes("three")) return 3;

  return 1;
}

function saveEntry() {
  const goal = Number(goalInput.value);
  const calories = Number(calorieInput.value);

  if (!foodInput.value.trim()) {
    alert("Please enter your food intake.");
    return;
  }

  if (!calories || calories <= 0) {
    alert("Please enter or estimate calories.");
    return;
  }

  const selectedDate = dateInput.value;
  const currentDateEntries = entries.filter(entry => entry.date === selectedDate);
  const currentConsumed = currentDateEntries.reduce((sum, entry) => sum + Number(entry.calories), 0);
  const newTotalConsumed = currentConsumed + calories;

  const remaining = goal - newTotalConsumed;
  const excess = remaining < 0 ? Math.abs(remaining) : 0;

  const entry = {
    action: "save",
    date: selectedDate,
    meal: mealInput.value,
    food: foodInput.value.trim(),
    calories: calories,
    dailyGoal: goal,
    remainingCalories: remaining > 0 ? remaining : 0,
    excessCalories: excess,
    notes: notesInput.value.trim()
  };

  entries.push(entry);
  localStorage.setItem("calorieEntries", JSON.stringify(entries));

  sendToGoogleSheets(entry);

  foodInput.value = "";
  calorieInput.value = "";
  notesInput.value = "";

  renderEntries();
}

function renderEntries() {
  const selectedDate = dateInput.value;
  const todayEntries = entries.filter(entry => entry.date === selectedDate);

  entriesList.innerHTML = "";

  if (todayEntries.length === 0) {
    entriesList.innerHTML = "<p>No entries for this date yet.</p>";
  }

  todayEntries.forEach(entry => {
    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <strong>${entry.meal} - ${entry.calories} kcal</strong>
      <p>${entry.food}</p>
      <small>${entry.notes || "No notes"}</small>
    `;

    entriesList.appendChild(div);
  });

  updateSummary(todayEntries);
}

function updateSummary(todayEntries) {
  const goal = Number(goalInput.value);
  const consumed = todayEntries.reduce((sum, entry) => sum + Number(entry.calories), 0);
  const remaining = goal - consumed;
  const excess = remaining < 0 ? Math.abs(remaining) : 0;
  const percentage = Math.min((consumed / goal) * 100, 100);

  consumedCalories.textContent = consumed;
  progressBar.style.width = `${percentage}%`;

  if (consumed === 0) {
    remainingCalories.textContent = goal;
    remainingLabel.textContent = "Remaining";
    statusText.textContent = "You have not logged anything yet.";
    progressBar.style.background = "#16a34a";
  } else if (remaining > 0) {
    remainingCalories.textContent = remaining;
    remainingLabel.textContent = "Remaining";
    statusText.textContent = `You consumed ${consumed} kcal. Remaining: ${remaining} kcal.`;
    progressBar.style.background = "#16a34a";
  } else if (remaining === 0) {
    remainingCalories.textContent = "0";
    remainingLabel.textContent = "Remaining";
    statusText.textContent = `You consumed exactly ${consumed} kcal. You reached your daily limit.`;
    progressBar.style.background = "#f59e0b";
  } else {
    remainingCalories.textContent = `+${excess}`;
    remainingLabel.textContent = "Excess Calories";
    statusText.textContent = `You consumed ${consumed} kcal. Excess calories: ${excess} kcal.`;
    progressBar.style.background = "#dc2626";
  }
}

function sendToGoogleSheets(entry) {
  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(entry)
  });
}

dateInput.addEventListener("change", renderEntries);
goalInput.addEventListener("input", renderEntries);

renderEntries();
