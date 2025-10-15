const express = require('express');
const { getDatabase } = require('../database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier
 *         name:
 *           type: string
 *           description: Room name
 *         svg_ref:
 *           type: string
 *           description: SVG reference identifier
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Get all rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: List of rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get('/', (req, res) => {
  const db = getDatabase();
  const { floor_plan_id } = req.query;
  
  let query = 'SELECT * FROM rooms';
  let params = [];
  
  // If floor_plan_id is provided, only return rooms used in that floor plan
  if (floor_plan_id) {
    query = `
      SELECT DISTINCT r.* 
      FROM rooms r
      INNER JOIN entities e ON r.id = e.room_id
      WHERE e.floor_plan_id = ?
    `;
    params = [floor_plan_id];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 */
router.post('/', (req, res) => {
  const db = getDatabase();
  const { name, svg_ref } = req.body;
  
  const stmt = db.prepare('INSERT INTO rooms (name, svg_ref) VALUES (?, ?) ON CONFLICT(svg_ref) DO UPDATE SET name = ?');
  stmt.run(name, svg_ref, name, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID });
  });
  stmt.finalize();
});

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *       404:
 *         description: Room not found
 */
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const id = req.params.id;
  
  db.run('DELETE FROM rooms WHERE id = ?', id, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

module.exports = router; 