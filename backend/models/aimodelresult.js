'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class AiModelResult extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      AiModelResult.belongsTo(models.AiAnalysis, { foreignKey: 'analysis_id', as: 'analysis' });
    }
  }
  AiModelResult.init({
    analysis_id: DataTypes.INTEGER,
    model_name: DataTypes.STRING,
    confidence: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'AiModelResult',
    tableName: 'ai_model_results',
    freezeTableName: true,
    underscored: true,
  });
  return AiModelResult;
};