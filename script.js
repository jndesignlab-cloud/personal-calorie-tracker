const API_URL = "https://script.google.com/macros/s/AKfycbwx4Xy73BwQcdEAeHqdKMdiMG5ZhtCJOLDrx_VR7O8LWVHXw1LICkLc_6ZuRcy8ukYT1g/exec";
const DAILY_LIMIT = 1650;

const dateInput = document.getElementById("dateInput");
const mealInput = document.getElementById("mealInput");
const foodInput = document.getElementById("foodInput");
const calorieInput = document.getElementById("calorieInput");
const notesInput = document.getElementById("notesInput");

const consumedCalories = document.getElementById("consumedCalories");
const remainingCalories = document.getElementById("remainingCalories");
const remainingLabel = document.getElementById("remainingLabel");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progressBar");

const entriesList = document.getElementById("entriesList");
const foodList = document.getElementById("foodList");

const newFoodInput = document.getElementById("newFoodInput");
const newCaloriesInput = document.getElementById("newCaloriesInput");

dateInput.valueAsDate = new Date();

async function callAPI(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function estimateCalories() {
  const food = foodInput.value.trim();

  if (!food) {
    alert("Please enter food intake.");
    return;
  }

  notesInput.value = "Checking FoodDatabase...";

  const data = await callAPI({
    action: "estimateOnly",
    food
  });

  if (data.missing && data.missing.length > 0) {
    for (const missingFood of data.missing) {
      const cal = prompt(`"${missingFood}" is not in your FoodDatabase. Enter calories per serving:`);

      if (cal && Number(cal) > 0) {
        await callAPI({
          action: "addFood",
          food: missingFood,
          calories: Number(cal)
        });
      }
    }

    return estimateCalories();
  }

  calorieInput.value = data.total;
  notesInput.value = data.breakdown.join("; ");
}

async function saveEntry() {
  const food = foodInput.value.trim();
  const calories = Number(calorieInput.value);

  if (!food) {
    alert("Please enter food intake.");
    return;
  }

  if (!calories || calories <= 0) {
    alert("Please check the database or enter calories manually.");
    return;
  }

  await callAPI({
    action: "saveLog",
    date: dateInput.value,
    meal: mealInput.value,
    food,
    calories,
    notes: notesInput.value
  });

  foodInput.value = "";
  calorieInput.value = "";
  notesInput.value = "";

  await loadLogs();
}

async function loadLogs() {
  entriesList.innerHTML = "<p class='note'>Loading entries...</p>";

  const data = await callAPI({
    action: "getLogs",
    date: dateInput.value
  });

  renderEntries(data.logs || []);
}

function renderEntries(logs) {
  entriesList.innerHTML = "";

  if (!logs.length) {
    entriesList.innerHTML = "<p class='note'>No entries for this date yet.</p>";
  }

  let total = 0;

  logs.forEach(log => {
    total += Number(log[4] || 0);

    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <strong>${log[2]} - ${log[4]} kcal</strong>
      <p>${log[3]}</p>
      <small>${log[7] || "No notes"}</small>
    `;

    entriesList.appendChild(div);
  });

  updateSummary(total);
}

function updateSummary(consumed) {
  const remaining = DAILY_LIMIT - consumed;
  const excess = remaining < 0 ? Math.abs(remaining) : 0;
  const progress = Math.min((consumed / DAILY_LIMIT) * 100, 100);

  consumedCalories.textContent = consumed;
  progressBar.style.width = `${progress}%`;

  if (consumed === 0) {
    remainingCalories.textContent = DAILY_LIMIT;
    remainingLabel.textContent = "Remaining";
    statusText.textContent = "You have not logged anything yet.";
    progressBar.style.background = "#22c55e";
  } else if (remaining > 0) {
    remainingCalories.textContent = remaining;
    remainingLabel.textContent = "Remaining";
    statusText.textContent = `You consumed ${consumed} kcal. Remaining: ${remaining} kcal.`;
    progressBar.style.background = "#22c55e";
  } else if (remaining === 0) {
    remainingCalories.textContent = "0";
    remainingLabel.textContent = "Remaining";
    statusText.textContent = "You reached your daily limit exactly.";
    progressBar.style.background = "#f59e0b";
  } else {
    remainingCalories.textContent = `+${excess}`;
    remainingLabel.textContent = "Excess";
    statusText.textContent = `You consumed ${consumed} kcal. Excess calories: ${excess} kcal.`;
    progressBar.style.background = "#ef4444";
  }
}

async function addFood() {
  const food = newFoodInput.value.trim().toLowerCase();
  const calories = Number(newCaloriesInput.value);

  if (!food || !calories) {
    alert("Please enter food and calories.");
    return;
  }

  await callAPI({
    action: "addFood",
    food,
    calories
  });

  newFoodInput.value = "";
  newCaloriesInput.value = "";

  await loadFoods();
}

async function loadFoods() {
  foodList.innerHTML = "<p class='note'>Loading food database...</p>";

  const data = await callAPI({
    action: "getFoods"
  });

  foodList.innerHTML = "";

  if (!data.foods || data.foods.length === 0) {
    foodList.innerHTML = "<p class='note'>No foods in database yet.</p>";
    return;
  }

  data.foods.forEach(item => {
    const div = document.createElement("div");
    div.className = "food-item";

    div.innerHTML = `
      <strong>${item.food}</strong>
      <p>${item.calories} kcal / serving</p>
    `;

    foodList.appendChild(div);
  });
}

dateInput.addEventListener("change", loadLogs);

loadLogs();
loadFoods();
