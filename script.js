// Variables
const todoInput = document.getElementById('todoInput');
const todoDate = document.getElementById('todoDate');
const priority = document.getElementById('priority');
const addButton = document.getElementById('addButton');
const todoList = document.getElementById('todoList');
const deleteAllButton = document.getElementById('deleteAll');
const totalCount = document.getElementById('totalCount');
const filterButtons = document.querySelectorAll('.filter');

// Add Task
addButton.addEventListener('click', () => {
    const taskText = todoInput.value.trim();
    const taskDate = todoDate.value || 'No Deadline';
    const taskPriority = priority.value;

    if (taskText === '') return;

    const li = document.createElement('li');
    li.textContent = `${taskText} - ${taskDate}`;
    li.classList.add(taskPriority);
    li.addEventListener('click', toggleCompleted);
    todoList.appendChild(li);

    updateCounter();
    clearInputs();
});

// Clear Inputs
function clearInputs() {
    todoInput.value = '';
    todoDate.value = '';
    priority.value = 'low';
}

// Toggle Completed
function toggleCompleted(event) {
    event.target.classList.toggle('completed');
}

// Delete All Tasks
deleteAllButton.addEventListener('click', () => {
    todoList.innerHTML = '';
    updateCounter();
});

// Update Counter
function updateCounter() {
    totalCount.textContent = todoList.children.length;
}

// Filter Tasks
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        const filter = button.dataset.filter;

        Array.from(todoList.children).forEach(task => {
            switch (filter) {
                case 'all':
                    task.style.display = '';
                    break;
                case 'completed':
                    task.style.display = task.classList.contains('completed') ? '' : 'none';
                    break;
                case 'incomplete':
                    task.style.display = task.classList.contains('completed') ? 'none' : '';
                    break;
            }
        });
    });
});
let debounceTimeout;

function debounce(func, delay) {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(func, delay);
}

document.querySelector('.input-field').addEventListener('input', function() {
    debounce(() => {
        // Kod për shtimin e detyrave ose filtrimin
    }, 500);
});
if (todoList.length === 0) {
    alert("No tasks available.");
}
if (todoList.length === 0) {
    alert("All tasks have been deleted.");
}
// Ruajtja e detyrave në localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(todoList));
}

// Ngarkimi i detyrave nga localStorage kur faqja ngarkohet
function loadTasks() {
    const savedTasks = JSON.parse(localStorage.getItem('tasks'));
    if (savedTasks) {
        todoList = savedTasks;
        renderTasks();
    }
}

// Thirrja e loadTasks kur faqja ngarkohet
window.onload = loadTasks;

// Çdo herë që shtoni ose fshini një detyrë, thirrni saveTasks:
addButton.addEventListener('click', function() {
    // Shtimi i detyrës
    saveTasks(); // Ruajtja e detyrave
});
