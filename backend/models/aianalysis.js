'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AiAnalysis extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      AiAnalysis.hasMany(models.AiModelResult, { foreignKey: 'analysis_id', as: 'modelResults' });
      AiAnalysis.hasMany(models.Order, { foreignKey: 'analysis_id', as: 'orders' });
    }
  }
  AiAnalysis.init({
    symbol: DataTypes.STRING,
    timeframe: DataTypes.STRING,
    is_doji_detected: DataTypes.BOOLEAN,
    status: DataTypes.STRING  // Change from ENUM to STRING for SQLite compatibility
  }, {
    sequelize,
    modelName: 'AiAnalysis',
    tableName: 'ai_analysis',  // Match migration table name (no 's')
    underscored: true, // This handles created_at, updated_at mapping automatically
  });
  return AiAnalysis;
};