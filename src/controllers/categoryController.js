const { Category } = require('../models');
const { success, error, formatCategory } = require('../utils/response');

const categoryController = {
  async index(req, res) {
    try {
      const { search, active_only } = req.query;

      let query = Category.query();

      if (active_only === 'true' || active_only === '1') {
        query = query.where('is_active', 1);
      }

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.whereRaw('(categories.name LIKE ? OR categories.description LIKE ?)', [term, term]);
      }

      query = query.orderBy('name', 'ASC');

      const categories = query.get();

      // Hydrate tickets count using Eloquent relationship
      const data = categories.map((cat) => {
        const ticketsCount = cat.tickets().count();
        return formatCategory({
          ...cat.toJSON(),
          tickets_count: ticketsCount,
        });
      });

      return success(res, data);
    } catch (err) {
      console.error('Category index error:', err);
      return error(res, 'Server error retrieving categories.', 500);
    }
  },

  async store(req, res) {
    try {
      const { name, description, is_active = true } = req.body;

      if (!name || !name.trim()) {
        return error(res, 'Validation failed', 422, { name: ['The name field is required.'] });
      }

      const existing = Category.where('name', name.trim()).first();
      if (existing) {
        return error(res, 'Validation failed', 422, { name: ['The category name has already been taken.'] });
      }

      const activeVal = is_active ? 1 : 0;
      const created = Category.create({
        name: name.trim(),
        description: description ? description.trim() : null,
        is_active: activeVal,
      });

      return success(
        res,
        formatCategory({ ...created.toJSON(), tickets_count: 0 }),
        'Category created successfully.',
        201
      );
    } catch (err) {
      console.error('Category store error:', err);
      return error(res, 'Server error creating category.', 500);
    }
  },

  async update(req, res) {
    try {
      const catId = req.params.category || req.params.id;
      const { name, description, is_active } = req.body;

      const category = Category.find(catId);
      if (!category) {
        return error(res, 'Category not found.', 404);
      }

      const updateData = {};

      if (name !== undefined) {
        const cleanName = name.trim();
        const duplicate = Category.where('name', cleanName).whereRaw('id != ?', [catId]).first();
        if (duplicate) {
          return error(res, 'Validation failed', 422, { name: ['The category name has already been taken.'] });
        }
        updateData.name = cleanName;
      }

      if (description !== undefined) {
        updateData.description = description ? description.trim() : null;
      }

      if (is_active !== undefined) {
        updateData.is_active = is_active ? 1 : 0;
      }

      if (Object.keys(updateData).length > 0) {
        await category.update(updateData);
      }

      const updated = Category.find(catId);
      const ticketsCount = updated.tickets().count();

      return success(
        res,
        formatCategory({ ...updated.toJSON(), tickets_count: ticketsCount }),
        'Category updated successfully.'
      );
    } catch (err) {
      console.error('Category update error:', err);
      return error(res, 'Server error updating category.', 500);
    }
  },

  async destroy(req, res) {
    try {
      const catId = req.params.category || req.params.id;

      const category = Category.find(catId);
      if (!category) {
        return error(res, 'Category not found.', 404);
      }

      const ticketsCount = category.tickets().count();
      if (ticketsCount > 0) {
        return error(res, 'Cannot delete category with associated tickets. Deactivate it instead.', 422);
      }

      await category.delete();
      return success(res, null, 'Category deleted successfully.');
    } catch (err) {
      console.error('Category delete error:', err);
      return error(res, 'Server error deleting category.', 500);
    }
  },
};

module.exports = categoryController;
