const GOOGLE_SCRIPT_URL = "PASTE_YOUR_WEB_APP_URL_HERE";

const foodDatabase = [
  { keyword: "rice", calories: 200 },
  { keyword: "1 cup rice", calories: 200 },
  { keyword: "fried chicken", calories: 350 },
  { keyword: "chicken", calories: 250 },
  { keyword: "egg", calories: 70 },
  { keyword: "boiled egg", calories: 70 },
  { keyword: "hotdog", calories: 150 },
  { keyword: "bread", calories: 120 },
  { keyword: "coffee", calories: 80 },
  { keyword: "iced coffee", calories: 180 },
  { keyword: "milk tea", calories: 350 },
  { keyword: "banana", calories: 100 },
  { keyword: "apple", calories: 95 },
  { keyword: "pork", calories: 300 },
  { keyword: "beef", calories: 300 },
  { keyword: "fish", calories: 220 },
  { keyword: "vegetables", calories: 80 },
  { keyword: "pasta", calories: 350 },
  { keyword: "burger", calories: 500 },
  { keyword: "fries", calories: 320 },
  { keyword: "pizza", calories: 285 },
  { keyword: "soft drink", calories: 150 }
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

function estimateCalories() {
  const foodText = foodInput.value.toLowerCase();
  let total = 0;

  foodDatabase.forEach(item => {
    if (foodText.includes(item.keyword)) {
      total += item.calories;
    }
  });

  calorieInput.value = total || 0;
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
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(entry)
  })
  .then(() => {
    console.log("Saved to Google Sheets");
  })
  .catch(error => {
    console.error("Google Sheets error:", error);
  });
}

dateInput.addEventListener("change", renderEntries);
goalInput.addEventListener("input", renderEntries);

renderEntries();
