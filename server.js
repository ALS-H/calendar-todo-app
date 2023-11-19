const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/calendar-todo', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const todoSchema = new mongoose.Schema({
  text: { type: String, required: true },
  priority: { type: String, default: 'Low' },
  date: { type: Date, default: Date.now },
  category: { type: String, default: 'General' },
  isDone: { type: Boolean, default: false }, // New field for tracking done status
});

const Todo = mongoose.model('Todo', todoSchema);

// New route to toggle the "isDone" property
app.patch('/api/todo/:id', async (req, res) => {
  try {
    const todoId = req.params.id;

    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId,
      { isDone: !req.body.isDone }, // Toggle the "isDone" property
      { new: true }
    );

    if (!updatedTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/todo/:id', async (req, res) => {
  try {
    const deletedTodo = await Todo.findByIdAndDelete(req.params.id);

    if (!deletedTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json(deletedTodo);
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/todo', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ date: -1 });
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/todo', async (req, res) => {
  try {
    const { text, priority = 'Low', category = 'General' } = req.body;

    // Use findOneAndUpdate to either update an existing todo or create a new one
    const updatedTodo = await Todo.findOneAndUpdate(
      { text, category },
      { text, priority, category, date: Date.now() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(updatedTodo);
  } catch (error) {
    console.error('Error adding/updating todo:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
