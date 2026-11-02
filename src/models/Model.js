const db = require('../config/db');

/**
 * Eloquent-Style Query Builder for SQLite
 */
class QueryBuilder {
  constructor(modelClass) {
    this.modelClass = modelClass;
    this.table = modelClass.table;
    this.selectColumns = [`${this.table}.*`];
    this.wheres = [];
    this.bindings = [];
    this.joins = [];
    this.orderBys = [];
    this.limitVal = null;
    this.offsetVal = null;
    this.groupByVal = null;
    this.withRelations = [];
  }

  select(...columns) {
    if (columns.length === 1 && Array.isArray(columns[0])) {
      this.selectColumns = columns[0];
    } else if (columns.length > 0) {
      this.selectColumns = columns;
    }
    return this;
  }

  qualifyColumn(col) {
    if (col.includes('.') || col.includes('(') || col.includes(' ') || col.includes('*')) {
      return col;
    }
    return `${this.table}.${col}`;
  }

  where(column, operator, value) {
    // Handle object of conditions: where({ role: 'customer', is_active: 1 })
    if (typeof column === 'object' && column !== null) {
      for (const [col, val] of Object.entries(column)) {
        this.where(col, '=', val);
      }
      return this;
    }

    // Two arguments: where('role', 'customer')
    if (value === undefined) {
      value = operator;
      operator = '=';
    }

    if (value === null) {
      if (operator === '=') {
        this.wheres.push(`${this.qualifyColumn(column)} IS NULL`);
      } else {
        this.wheres.push(`${this.qualifyColumn(column)} IS NOT NULL`);
      }
      return this;
    }

    this.wheres.push(`${this.qualifyColumn(column)} ${operator} ?`);
    this.bindings.push(value);
    return this;
  }

  orWhere(column, operator, value) {
    if (value === undefined) {
      value = operator;
      operator = '=';
    }
    const clause = `${this.qualifyColumn(column)} ${operator} ?`;
    if (this.wheres.length === 0) {
      this.wheres.push(clause);
    } else {
      const prev = this.wheres.pop();
      this.wheres.push(`(${prev} OR ${clause})`);
    }
    this.bindings.push(value);
    return this;
  }

  whereIn(column, values) {
    if (!values || !Array.isArray(values) || values.length === 0) {
      this.wheres.push('1 = 0');
      return this;
    }
    const placeholders = values.map(() => '?').join(', ');
    this.wheres.push(`${this.qualifyColumn(column)} IN (${placeholders})`);
    this.bindings.push(...values);
    return this;
  }

  whereNotIn(column, values) {
    if (!values || !Array.isArray(values) || values.length === 0) {
      return this;
    }
    const placeholders = values.map(() => '?').join(', ');
    this.wheres.push(`${this.qualifyColumn(column)} NOT IN (${placeholders})`);
    this.bindings.push(...values);
    return this;
  }

  whereNull(column) {
    this.wheres.push(`${this.qualifyColumn(column)} IS NULL`);
    return this;
  }

  whereNotNull(column) {
    this.wheres.push(`${this.qualifyColumn(column)} IS NOT NULL`);
    return this;
  }

  whereRaw(sql, params = []) {
    this.wheres.push(`(${sql})`);
    if (Array.isArray(params)) {
      this.bindings.push(...params);
    } else {
      this.bindings.push(params);
    }
    return this;
  }

  join(table, first, operator, second) {
    this.joins.push(`JOIN ${table} ON ${first} ${operator} ${second}`);
    return this;
  }

  leftJoin(table, first, operator, second) {
    this.joins.push(`LEFT JOIN ${table} ON ${first} ${operator} ${second}`);
    return this;
  }

  groupBy(column) {
    this.groupByVal = column;
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.orderBys.push(`${this.qualifyColumn(column)} ${direction.toUpperCase()}`);
    return this;
  }

  orderByDesc(column) {
    return this.orderBy(column, 'DESC');
  }

  latest(column = 'created_at') {
    return this.orderBy(column, 'DESC');
  }

  oldest(column = 'created_at') {
    return this.orderBy(column, 'ASC');
  }

  limit(limit) {
    this.limitVal = limit;
    return this;
  }

  take(n) {
    return this.limit(n);
  }

  offset(offset) {
    this.offsetVal = offset;
    return this;
  }

  skip(n) {
    return this.offset(n);
  }

  with(...relations) {
    if (relations.length === 1 && Array.isArray(relations[0])) {
      this.withRelations.push(...relations[0]);
    } else {
      this.withRelations.push(...relations);
    }
    return this;
  }

  _buildWhereClause() {
    if (this.wheres.length === 0) return '';
    return `WHERE ${this.wheres.join(' AND ')}`;
  }

  _buildSql() {
    let sql = `SELECT ${this.selectColumns.join(', ')} FROM ${this.table}`;
    if (this.joins.length > 0) {
      sql += ` ${this.joins.join(' ')}`;
    }
    const whereClause = this._buildWhereClause();
    if (whereClause) {
      sql += ` ${whereClause}`;
    }
    if (this.groupByVal) {
      sql += ` GROUP BY ${this.groupByVal}`;
    }
    if (this.orderBys.length > 0) {
      sql += ` ORDER BY ${this.orderBys.join(', ')}`;
    }
    if (this.limitVal !== null) {
      sql += ` LIMIT ${this.limitVal}`;
    }
    if (this.offsetVal !== null) {
      sql += ` OFFSET ${this.offsetVal}`;
    }
    return sql;
  }

  count(column = '*') {
    let sql = `SELECT COUNT(${column}) as aggregate FROM ${this.table}`;
    if (this.joins.length > 0) {
      sql += ` ${this.joins.join(' ')}`;
    }
    const whereClause = this._buildWhereClause();
    if (whereClause) {
      sql += ` ${whereClause}`;
    }
    const row = db.queryOne(sql, this.bindings);
    return row ? Number(row.aggregate) : 0;
  }

  first() {
    this.limit(1);
    const sql = this._buildSql();
    const row = db.queryOne(sql, this.bindings);
    if (!row) return null;
    const instance = new this.modelClass(row);
    if (this.withRelations.length > 0 && typeof this.modelClass.eagerLoad === 'function') {
      this.modelClass.eagerLoad([instance], this.withRelations);
    }
    return instance;
  }

  get() {
    const sql = this._buildSql();
    const rows = db.query(sql, this.bindings);
    const instances = rows.map((row) => new this.modelClass(row));
    if (this.withRelations.length > 0 && typeof this.modelClass.eagerLoad === 'function') {
      this.modelClass.eagerLoad(instances, this.withRelations);
    }
    return instances;
  }

  paginate(page = 1, perPage = 15) {
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(perPage, 10) || 15);
    const offset = (currentPage - 1) * limit;

    // Run count query with cloned conditions
    let countSql = `SELECT COUNT(*) as aggregate FROM ${this.table}`;
    if (this.joins.length > 0) {
      countSql += ` ${this.joins.join(' ')}`;
    }
    const whereClause = this._buildWhereClause();
    if (whereClause) {
      countSql += ` ${whereClause}`;
    }
    const countRow = db.queryOne(countSql, this.bindings);
    const total = countRow ? Number(countRow.aggregate) : 0;

    // Fetch paginated slice
    this.limit(limit).offset(offset);
    const items = this.get();
    const lastPage = Math.ceil(total / limit) || 1;

    return {
      data: items,
      current_page: currentPage,
      last_page: lastPage,
      per_page: limit,
      total,
    };
  }
}

/**
 * Eloquent Base Model
 */
class Model {
  static table = '';
  static primaryKey = 'id';
  static timestamps = true;

  constructor(attributes = {}) {
    Object.assign(this, attributes);
  }

  static query() {
    return new QueryBuilder(this);
  }

  static select(...columns) {
    return this.query().select(...columns);
  }

  static where(...args) {
    return this.query().where(...args);
  }

  static whereIn(col, values) {
    return this.query().whereIn(col, values);
  }

  static whereNotIn(col, values) {
    return this.query().whereNotIn(col, values);
  }

  static whereNull(col) {
    return this.query().whereNull(col);
  }

  static whereNotNull(col) {
    return this.query().whereNotNull(col);
  }

  static whereRaw(sql, params) {
    return this.query().whereRaw(sql, params);
  }

  static orderBy(column, direction = 'ASC') {
    return this.query().orderBy(column, direction);
  }

  static orderByDesc(column) {
    return this.query().orderByDesc(column);
  }

  static latest(column = 'created_at') {
    return this.query().latest(column);
  }

  static oldest(column = 'created_at') {
    return this.query().oldest(column);
  }

  static limit(limit) {
    return this.query().limit(limit);
  }

  static with(...relations) {
    return this.query().with(...relations);
  }

  static count(column = '*') {
    return this.query().count(column);
  }

  static all() {
    return this.query().get();
  }

  static find(id) {
    if (!id && id !== 0) return null;
    return this.query().where(this.primaryKey, id).first();
  }

  static findOrFail(id) {
    const instance = this.find(id);
    if (!instance) {
      const err = new Error(`${this.name} with ${this.primaryKey} ${id} not found.`);
      err.status = 404;
      throw err;
    }
    return instance;
  }

  static findBy(column, value) {
    return this.query().where(column, value).first();
  }

  static create(attributes = {}) {
    const data = { ...attributes };
    if (this.timestamps) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (!data.created_at) data.created_at = now;
      if (!data.updated_at) data.updated_at = now;
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;

    const result = db.execute(sql, values);
    const insertId = Number(result.lastInsertRowid);
    return this.find(insertId);
  }

  static update(id, attributes = {}) {
    const data = { ...attributes };
    if (this.timestamps && !data.updated_at) {
      data.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }
    delete data[this.primaryKey];

    const keys = Object.keys(data);
    if (keys.length === 0) return this.find(id);

    const values = Object.values(data);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const sql = `UPDATE ${this.table} SET ${setClause} WHERE ${this.primaryKey} = ?`;

    db.execute(sql, [...values, id]);
    return this.find(id);
  }

  static destroy(id) {
    const sql = `DELETE FROM ${this.table} WHERE ${this.primaryKey} = ?`;
    return db.execute(sql, [id]);
  }

  // Active record instance methods
  async update(attributes = {}) {
    const id = this[this.constructor.primaryKey];
    const updated = this.constructor.update(id, attributes);
    if (updated) {
      Object.assign(this, updated);
    }
    return this;
  }

  async delete() {
    const id = this[this.constructor.primaryKey];
    return this.constructor.destroy(id);
  }

  toJSON() {
    return { ...this };
  }

  // Relationships helper on instance
  belongsTo(RelatedModel, foreignKey, ownerKey = 'id') {
    const val = this[foreignKey];
    if (!val) return null;
    return RelatedModel.find(val);
  }

  hasMany(RelatedModel, foreignKey, localKey = 'id') {
    const val = this[localKey];
    if (!val) return RelatedModel.where('1', '0');
    return RelatedModel.where(foreignKey, val);
  }

  hasOne(RelatedModel, foreignKey, localKey = 'id') {
    const val = this[localKey];
    if (!val) return null;
    return RelatedModel.where(foreignKey, val).first();
  }
}

module.exports = { Model, QueryBuilder };
