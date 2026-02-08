const express = require('express');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const mongoService = require('../services/mongoService');

const router = express.Router();

/**
 * Get prompts collection
 */
async function getCollection() {
  return mongoService.getCollection(config.mongodb.collections.prompts);
}

/**
 * GET /api/prompts
 * List prompts for the current user
 */
router.get('/', async (req, res, next) => {
  try {
    const collection = await getCollection();
    const { type, tag, search } = req.query;

    // Build query - user's prompts or shared prompts
    const query = {
      $or: [
        { userId: req.user.id },
        { userId: null },
      ],
    };

    if (type) {
      query.type = type;
    }

    if (tag) {
      query.tags = tag;
    }

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { content: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const prompts = await collection
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    res.json({ prompts });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/:id
 * Get a single prompt
 */
router.get('/:id', async (req, res, next) => {
  try {
    const collection = await getCollection();
    const prompt = await collection.findOne({ id: req.params.id });

    if (!prompt) {
      return res.status(404).json({
        error: {
          message: 'Prompt not found',
          type: 'not_found_error',
          code: 'prompt_not_found',
        },
      });
    }

    // Check access
    if (prompt.userId && prompt.userId !== req.user.id) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
    }

    res.json({ prompt });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts
 * Create a new prompt
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, content, description, type, tags, isDefault } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: {
          message: 'Name is required',
          type: 'validation_error',
          code: 'missing_name',
        },
      });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        error: {
          message: 'Content is required',
          type: 'validation_error',
          code: 'missing_content',
        },
      });
    }

    // Validate type
    const validTypes = ['system', 'user', 'template'];
    const promptType = type || 'template';
    if (!validTypes.includes(promptType)) {
      return res.status(400).json({
        error: {
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
          type: 'validation_error',
          code: 'invalid_type',
        },
      });
    }

    const collection = await getCollection();
    const now = new Date().toISOString();

    const prompt = {
      id: uuidv4(),
      userId: req.user.id,
      name: name.trim(),
      content: content.trim(),
      description: description?.trim() || '',
      type: promptType,
      tags: Array.isArray(tags) ? tags.map(t => t.trim()).filter(t => t) : [],
      isDefault: !!isDefault,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(prompt);

    res.status(201).json({ prompt });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/prompts/:id
 * Update a prompt
 */
router.put('/:id', async (req, res, next) => {
  try {
    const collection = await getCollection();
    const existing = await collection.findOne({ id: req.params.id });

    if (!existing) {
      return res.status(404).json({
        error: {
          message: 'Prompt not found',
          type: 'not_found_error',
          code: 'prompt_not_found',
        },
      });
    }

    // Check ownership
    if (existing.userId && existing.userId !== req.user.id) {
      return res.status(403).json({
        error: {
          message: 'You can only edit your own prompts',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
    }

    const { name, content, description, type, tags, isDefault } = req.body;

    // Build update object
    const updates = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          error: {
            message: 'Name cannot be empty',
            type: 'validation_error',
            code: 'invalid_name',
          },
        });
      }
      updates.name = name.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || !content.trim()) {
        return res.status(400).json({
          error: {
            message: 'Content cannot be empty',
            type: 'validation_error',
            code: 'invalid_content',
          },
        });
      }
      updates.content = content.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || '';
    }

    if (type !== undefined) {
      const validTypes = ['system', 'user', 'template'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: {
            message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
            type: 'validation_error',
            code: 'invalid_type',
          },
        });
      }
      updates.type = type;
    }

    if (tags !== undefined) {
      updates.tags = Array.isArray(tags) ? tags.map(t => t.trim()).filter(t => t) : [];
    }

    if (isDefault !== undefined) {
      updates.isDefault = !!isDefault;
    }

    await collection.updateOne(
      { id: req.params.id },
      { $set: updates }
    );

    const prompt = await collection.findOne({ id: req.params.id });

    res.json({ prompt });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/prompts/:id
 * Delete a prompt
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const collection = await getCollection();
    const existing = await collection.findOne({ id: req.params.id });

    if (!existing) {
      return res.status(404).json({
        error: {
          message: 'Prompt not found',
          type: 'not_found_error',
          code: 'prompt_not_found',
        },
      });
    }

    // Check ownership
    if (existing.userId && existing.userId !== req.user.id) {
      return res.status(403).json({
        error: {
          message: 'You can only delete your own prompts',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
    }

    await collection.deleteOne({ id: req.params.id });

    res.json({
      success: true,
      message: 'Prompt deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/:id/duplicate
 * Duplicate a prompt
 */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const collection = await getCollection();
    const existing = await collection.findOne({ id: req.params.id });

    if (!existing) {
      return res.status(404).json({
        error: {
          message: 'Prompt not found',
          type: 'not_found_error',
          code: 'prompt_not_found',
        },
      });
    }

    // Check access
    if (existing.userId && existing.userId !== req.user.id) {
      return res.status(403).json({
        error: {
          message: 'Access denied',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
    }

    const now = new Date().toISOString();

    const prompt = {
      id: uuidv4(),
      userId: req.user.id,
      name: `${existing.name} (Copy)`,
      content: existing.content,
      description: existing.description,
      type: existing.type,
      tags: [...existing.tags],
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(prompt);

    res.status(201).json({ prompt });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
