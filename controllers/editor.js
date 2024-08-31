const express = require('express');
const router = express.Router();
const db = require('../db/index');

// Middleware to check if the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    return res.redirect('/login');
  }
  next();
}

/* GET home page. */
router.get('/direct', ensureAuthenticated, (req, res) => {
  res.render('editorDirect', { title: 'Bot Editor' });
});

router.get('/graphs', ensureAuthenticated, async (req, res) => {
  try {
    const graphs = await db.botSchema.find();
    const names = graphs.map(graph => graph.name);
    console.log(names);
    res.json(names);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/open', ensureAuthenticated, async (req, res) => {
  try {
    console.log(req.body.name);
    const graph = await db.botSchema.findOne({ name: req.body.name });
    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }
    res.json(graph);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/exist', ensureAuthenticated, async (req, res) => {
  try {
    if (req.body.name) {
      const botGraph = await db.botSchema.findOne({ name: req.body.name });
      res.json({ result: botGraph !== null });
    } else {
      res.status(400).json({ error: 'Name is required' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/save', ensureAuthenticated, async (req, res) => {
  try {
    const { name, graph } = req.body;

    if (name && graph) {
      let botGraph = await db.botSchema.findOne({ name });

      if (!botGraph) {
        botGraph = await db.botSchema.create({ name, graph });
      } else {
        botGraph.graph = graph;
        botGraph.updated = Date.now();
        await botGraph.save();
      }

      res.json({ result: true });
    } else {
      res.status(400).json({ result: false, error: 'Name and graph are required' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ result: false, error: 'Internal server error' });
  }
});

router.get('/', ensureAuthenticated, (req, res) => {
  res.render('editor', { title: 'Bot Editor', user: req.user });
});

module.exports = router;
