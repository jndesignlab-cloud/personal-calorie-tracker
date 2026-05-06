const API_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
const DAILY_LIMIT = 1650;

let foods = [];
let mealItems = [];

const dateInput = document.getElementById("dateInput");
const mealInput = document.getElementById("mealInput");
const foodSelect = document.getElementById("foodSelect");
const quantityInput = document.getElementById("quantityInput");
const calorieInput = document.getElementById("calorieInput");
const notesInput = document.getElementById("notesInput");

const consumedCalories = document.getElementById("consumedCalories");
const remainingCalories = document.getElementById("remainingCalories");
const remainingLabel = document.getElementById("remainingLabel");
const statusText = document.getElementById("statusText");
const progressBar = document.getElementById("progressBar");

const entriesList = document.getElementById("entriesList");
const mealItemsContainer = document.getElementById("mealItems");

const foodModal = document.getElementById("foodModal");
const newFoodInput = document.getElementById("newFoodInput");
const newCaloriesInput = document.getElementById("newCaloriesInput");

dateInput.valueAsDate = new Date();

async function callAPI(payload) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return await response.json();
}

async function loadFoods() {
  foodSelect.innerHTML = "<option>Loading foods...</option>";

  const data = await callAPI({ action: "getFoods" });

  if (data.status !== "success") {
    foodSelect.innerHTML = `<option>${data.message || "Error loading foods"}</option>`;
    return;
  }

  foods = data.foods || [];
  foodSelect.innerHTML = "";

  if (!foods.length) {
    foodSelect.innerHTML = "<option>No foods found</option>";
    return;
  }

  foods.forEach(item => {
    const option = document.createElement("option");
    option.value = item.food;
    option.textContent = `${item.food} - ${item.calories} kcal`;
    option.dataset.calories = item.calories;
    foodSelect.appendChild(option);
  });
}

function addMealItem() {
  const selectedOption = foodSelect.selectedOptions[0];

  if (!selectedOption || foodSelect.value === "No foods found") {
    alert("Please add food to your database first.");
    return;
  }

  const food = foodSelect.value;
  const caloriesPerServing = Number(selectedOption.dataset.calories);
  const quantity = Number(quantityInput.value);

  if (!quantity || quantity <= 0) {
    alert("Please enter a valid quantity.");
    return;
  }

  const totalCalories = caloriesPerServing * quantity;

  mealItems.push({
    food,
    quantity,
    caloriesPerServing,
    totalCalories
  });

  quantityInput.value = 1;
  renderMealItems();
}

function renderMealItems() {
  mealItemsContainer.innerHTML = "";

  let total = 0;
  let notes = [];

  mealItems.forEach((item, index) => {
    total += item.totalCalories;
    notes.push(`${item.food} x ${item.quantity} = ${item.totalCalories} kcal`);

    const div = document.createElement("div");
    div.className = "meal-item";

    div.innerHTML = `
      <div>
        <strong>${item.food}</strong>
        <p>${item.quantity} x ${item.caloriesPerServing} kcal = ${item.totalCalories} kcal</p>
      </div>
      <button class="remove-item-btn" onclick="removeMealItem(${index})">Remove</button>
    `;

    mealItemsContainer.appendChild(div);
  });

  calorieInput.value = total;
  notesInput.value = notes.join("; ");
}

function removeMealItem(index) {
  mealItems.splice(index, 1);
  renderMealItems();
}

async function saveEntry() {
  if (!mealItems.length) {
    alert("Please add at least one food item.");
    return;
  }

  const totalCalories = Number(calorieInput.value);

  const foodText = mealItems
    .map(item => `${item.food} x ${item.quantity}`)
    .join(", ");

  const totalQuantity = mealItems
    .reduce((sum, item) => sum + Number(item.quantity), 0);

  const data = await callAPI({
    action: "saveLog",
    date: dateInput.value,
    meal: mealInput.value,
    food: foodText,
    quantity: totalQuantity,
    calories: totalCalories,
    notes: notesInput.value
  });

  if (data.status !== "success") {
    alert(data.message || "Unable to save meal.");
    return;
  }

  mealItems = [];
  renderMealItems();

  await loadLogs();
}

async function loadLogs() {
  entriesList.innerHTML = "<p class='note'>Loading entries...</p>";

  const data = await callAPI({
    action: "getLogs",
    date: dateInput.value
  });

  if (data.status !== "success") {
    entriesList.innerHTML = `<p class='note'>${data.message || "Unable to load entries."}</p>`;
    return;
  }

  renderEntries(data.logs || []);
}

function renderEntries(logs) {
  entriesList.innerHTML = "";

  if (!logs.length) {
    entriesList.innerHTML = "<p class='note'>No entries for this date yet.</p>";
    updateSummary(0);
    return;
  }

  let consumed = 0;

  logs.forEach(log => {
    consumed += Number(log.calories || 0);

    const div = document.createElement("div");
    div.className = "entry";

    div.innerHTML = `
      <strong>${log.meal} - ${log.calories} kcal</strong>
      <p>${log.food}</p>
      <small>${log.notes || "No notes"}</small>
    `;

    entriesList.appendChild(div);
  });

  updateSummary(consumed);
}

function updateSummary(consumed) {
  const remainingRaw = DAILY_LIMIT - consumed;
  const remaining = remainingRaw > 0 ? remainingRaw : 0;
  const excess = remainingRaw < 0 ? Math.abs(remainingRaw) : 0;
  const progress = Math.min((consumed / DAILY_LIMIT) * 100, 100);

  consumedCalories.textContent = consumed;
  progressBar.style.width = `${progress}%`;

  if (consumed === 0) {
    remainingCalories.textContent = DAILY_LIMIT;
    remainingLabel.textContent = "Remaining";
    statusText.textContent = "You have not logged anything yet.";
    progressBar.style.background = "#22c55e";
  } else if (remainingRaw > 0) {
    remainingCalories.textContent = remaining;
    remainingLabel.textContent = "Remaining";
    statusText.textContent = `You consumed ${consumed} kcal. Remaining: ${remaining} kcal.`;
    progressBar.style.background = "#22c55e";
  } else if (remainingRaw === 0) {
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

function openFoodModal() {
  foodModal.classList.remove("hidden");
}

function closeFoodModal() {
  foodModal.classList.add("hidden");
}

async function addFood() {
  const food = newFoodInput.value.trim();
  const calories = Number(newCaloriesInput.value);

  if (!food || !calories) {
    alert("Please enter food name and calories.");
    return;
  }

  const data = await callAPI({
    action: "addFood",
    food,
    calories
  });

  if (data.status !== "success") {
    alert(data.message || "Unable to add food.");
    return;
  }

  newFoodInput.value = "";
  newCaloriesInput.value = "";

  closeFoodModal();
  await loadFoods();
}

dateInput.addEventListener("change", loadLogs);

loadFoods();
loadLogs();
