import React, { useState, useEffect, useRef } from 'react';
import './ToDo.css';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import Modal from 'react-modal';
import './Calendar.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const Calendar = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [todos, setTodos] = useState({});
  const [newTodo, setNewTodo] = useState('');
  const [newPriority, setNewPriority] = useState('Low');
  const [loading, setLoading] = useState(true);
  const [hasTodosForSelectedDate, setHasTodosForSelectedDate] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all'); // Default to 'all'
  const calendarRef = useRef(null); // Add a ref for FullCalendar
  const currentDate = new Date().toISOString().split('T')[0]; // Get the current date in 'YYYY-MM-DD' format

  const isPastDate = selectedDate < currentDate;

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    // Additional logic if needed, e.g., fetching todos for the selected category
  };

  const eventClassNames = (arg) => {
    const priorityColor = handlePriorityColor(arg.event.extendedProps.priority);
    return `event-priority-${priorityColor}`;
  };

  useEffect(() => {
    const storedTodos = localStorage.getItem('todos');

    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
      setLoading(false);
    } else {
      fetch('http://localhost:8000/api/todos')
        .then((res) => res.json())
        .then((data) => {
          const sortedData = {};
          for (const date in data) {
            sortedData[date] = Object.values(data[date]).sort((a, b) => {
              const priorityOrder = { Low: 0, Medium: 1, High: 2 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
          }

          setTodos(sortedData);
          setLoading(false);
          localStorage.setItem('todos', JSON.stringify(sortedData));
        })
        .catch((error) => {
          console.error('Error fetching todos:', error);
          setLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    setHasTodosForSelectedDate(selectedDate in todos);
  }, [selectedDate, todos]);
  

  const handleToggleDone = (id) => {
    console.log('Toggling done for todo ID:', id);
    const updatedTodos = { ...todos };
  
    if (selectedDate in updatedTodos && id in updatedTodos[selectedDate]) {
      updatedTodos[selectedDate][id].isDone = !updatedTodos[selectedDate][id].isDone;
  
      setTodos(updatedTodos);
      localStorage.setItem('todos', JSON.stringify(updatedTodos));
  
      // Use refetchEvents instead of rerenderEvents
      calendarRef.current.getApi().refetchEvents();
    }
    console.log('Todo after toggle:', updatedTodos[selectedDate][id]);
  };
  

  const getEventSources = () => {
    const eventSources = [];

    for (const date in todos) {
      const events = Object.values(todos[date])
        .sort((a, b) => {
          const priorityOrder = { Low: 0, Medium: 1, High: 2 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .map((todo) => ({
          title: todo.text,
          start: date,
          color: handlePriorityColor(todo.priority),
        }));

      eventSources.push(...events);
    }

    return eventSources;
  };

  const handlePriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'red';
      case 'Medium':
        return 'orange';
      case 'Low':
        return 'green';
      default:
        return 'green';
    }
  };

  const deleteTodo = (id) => {
    const updatedTodos = { ...todos };

    if (selectedDate in updatedTodos && id in updatedTodos[selectedDate]) {
      delete updatedTodos[selectedDate][id];

      setTodos(updatedTodos);

      localStorage.setItem('todos', JSON.stringify(updatedTodos));

      fetch(`http://localhost:8000/api/todos/${id}`, {
        method: 'DELETE',
      })
        .then((res) => res.json())
        .then((data) => console.log('Todo deleted:', data))
        .catch((error) => console.error('Error deleting todo:', error));
    }
  };

  const sortedTodos = selectedDate in todos
    ? Object.values(todos[selectedDate]).filter(todo => selectedCategory === 'all' || todo.category === selectedCategory)
      .sort((a, b) => {
        const priorityOrder = { Low: 0, Medium: 1, High: 2 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
    : [];

  if (loading) {
    return <p>Loading...</p>;
  }

  const handleDateClick = (args) => {
    const date = args.dateStr;
    setSelectedDate(date);
    openModal();
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const addTodo = () => {
    if (isPastDate) {
      alert("Cannot add todos to past dates!");
      return;
    }
  
    const newTodoItem = {
      text: newTodo,
      priority: newPriority,
      date: selectedDate,
      category: selectedCategory,
    };
  
    fetch('http://localhost:8000/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTodoItem),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Todo added:', data);
  
        const updatedTodos = { ...todos };
        if (!(selectedDate in updatedTodos)) {
          updatedTodos[selectedDate] = {};
        }
  
        updatedTodos[selectedDate][data._id] = {
          text: newTodo,
          priority: newPriority,
          date: selectedDate,
          category: selectedCategory,
          _id: data._id,
          isDone: false, // Initialize isDone property
        };
  
        localStorage.setItem('todos', JSON.stringify(updatedTodos));
  
        setTodos(updatedTodos);
        setNewTodo('');
        setNewPriority('Low');
  
        calendarRef.current.getApi().rerenderEvents();
      })
      .catch((error) => console.error('Error adding todo:', error));
  };
  

  return (
    <div className="calendar-container">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        dateClick={handleDateClick}
        events={getEventSources()}
        eventClassNames={eventClassNames}
      />

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Add Todo Modal"
      >
        <div className="todo-container">
          <div className="todo">
            <h1>TODO for {selectedDate}</h1>
            <div>
              <input
                type="text"
                className="todo-input"
                placeholder="Add a new todo.."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                disabled={isPastDate}
              />
              <select
                className="todo-input"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <div>
                <button className="cat-button" onClick={() => handleCategoryChange('all')}>All</button>
                <button className="cat-button" onClick={() => handleCategoryChange('work')}>Work</button>
                <button className="cat-button" onClick={() => handleCategoryChange('personal')}>Personal</button>
                <button className="cat-button" onClick={() => handleCategoryChange('entertainment')}>Entertainment</button>
              </div>
              <button className="todo-button" onClick={addTodo} disabled={isPastDate}>
                Add Todo
              </button>
              <button className="close-button" onClick={closeModal}>
                Close
              </button>
            </div>
            <div>
              {sortedTodos.map((todo) => (
                <div key={todo._id} style={{ color: handlePriorityColor(todo.priority), textDecoration: todo.isDone ? 'line-through' : 'none' }}>
                  <p style={{ fontWeight: 'bold' }}>
                    {todo.text}
                  </p>
                  <button
                    className="done-button"
                    onClick={() => handleToggleDone(todo._id)}
                  >
                    {todo.isDone ? 'Undo' : 'Done'}
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => deleteTodo(todo._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;
