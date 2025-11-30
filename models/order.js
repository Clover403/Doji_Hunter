'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Order.belongsTo(models.AiAnalysis, { foreignKey: 'analysis_id' });
    }
  }
  Order.init({
    analysis_id: DataTypes.INTEGER,
    order_ticket: DataTypes.STRING,
    symbol: DataTypes.STRING,
    type: DataTypes.STRING,
    entry_price: DataTypes.FLOAT,
    sl: DataTypes.FLOAT,
    tp: DataTypes.FLOAT,
    risk_per_trade: DataTypes.FLOAT,
    closed_price: DataTypes.FLOAT,
    profit_money: DataTypes.FLOAT,
    profit_pips: DataTypes.FLOAT,
    result: DataTypes.ENUM('WIN', 'LOSS', 'OPEN'),
    closed_at: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    freezeTableName: true,
    underscored: true,
  });
  return Order;
};