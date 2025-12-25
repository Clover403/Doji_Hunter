'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      analysis_id: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'ai_analysis',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      order_ticket: {
        type: Sequelize.STRING
      },
      symbol: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      entry_price: {
        type: Sequelize.FLOAT
      },
      sl: {
        type: Sequelize.FLOAT
      },
      tp: {
        type: Sequelize.FLOAT
      },
      risk_per_trade: {
        type: Sequelize.FLOAT
      },
      closed_price: {
        type: Sequelize.FLOAT
      },
      profit_money: {
        type: Sequelize.FLOAT
      },
      profit_pips: {
        type: Sequelize.FLOAT
      },
      result: {
        type: Sequelize.STRING,
        validate: {
          isIn: [['WIN', 'LOSS', 'OPEN']]
        }
      },
      closed_at: {
        type: Sequelize.DATE
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orders');
  }
};