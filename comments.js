// Create web server application
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto'); // randomBytes is a function that generates a random string of characters
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create an object to store all the comments
const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
  // Return all the comments for a given post
  res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
  // Create an id for the comment
  const commentId = randomBytes(4).toString('hex');
  // Get the content of the comment
  const { content } = req.body;

  // Get all the comments for a given post
  const comments = commentsByPostId[req.params.id] || [];

  // Add the new comment to the comments list
  comments.push({ id: commentId, content, status: 'pending' });

  // Update the comments list
  commentsByPostId[req.params.id] = comments;

  // Emit an event to the event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  // Return the new comment list
  res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  const { type, data } = req.body;

  if (type === 'CommentModerated') {
    // Get the comment
    const { id, postId, status, content } = data;

    // Get all the comments for a given post
    const comments = commentsByPostId[postId];

    // Find the comment to be updated
    const comment = comments.find((comment) => {
      return comment.id === id;
    });

    // Update the comment
    comment.status = status;

    // Emit an event to the event bus
    await axios.post('http://event-bus-srv:4005/events', {