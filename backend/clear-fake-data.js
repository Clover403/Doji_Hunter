/**
 * Script untuk menghapus semua fake order dari database
 * Jalankan dengan: node clear-fake-data.js
 */

const { Sequelize } = require('sequelize');
const path = require('path');

async function clearFakeData() {
    console.log('========================================');
    console.log('🗑️  CLEARING ALL FAKE DATA FROM DATABASE');
    console.log('========================================\n');
    
    // Connect to SQLite database
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'database.sqlite'),
        logging: false
    });
    
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database\n');
        
        // Get counts before clearing
        const [ordersBefore] = await sequelize.query('SELECT COUNT(*) as count FROM Orders');
        const [analysesBefore] = await sequelize.query('SELECT COUNT(*) as count FROM AiAnalyses');
        const [resultsBefore] = await sequelize.query('SELECT COUNT(*) as count FROM AiModelResults');
        
        console.log('📊 Current data in database:');
        console.log(`   - Orders: ${ordersBefore[0].count}`);
        console.log(`   - AiAnalyses: ${analysesBefore[0].count}`);
        console.log(`   - AiModelResults: ${resultsBefore[0].count}\n`);
        
        // Clear all tables
        console.log('🗑️  Clearing tables...');
        
        await sequelize.query('DELETE FROM Orders');
        console.log('   ✅ Orders cleared');
        
        await sequelize.query('DELETE FROM AiAnalyses');
        console.log('   ✅ AiAnalyses cleared');
        
        await sequelize.query('DELETE FROM AiModelResults');
        console.log('   ✅ AiModelResults cleared');
        
        // Verify
        const [ordersAfter] = await sequelize.query('SELECT COUNT(*) as count FROM Orders');
        const [analysesAfter] = await sequelize.query('SELECT COUNT(*) as count FROM AiAnalyses');
        const [resultsAfter] = await sequelize.query('SELECT COUNT(*) as count FROM AiModelResults');
        
        console.log('\n📊 After clearing:');
        console.log(`   - Orders: ${ordersAfter[0].count}`);
        console.log(`   - AiAnalyses: ${analysesAfter[0].count}`);
        console.log(`   - AiModelResults: ${resultsAfter[0].count}`);
        
        console.log('\n========================================');
        console.log('✅ ALL FAKE DATA HAS BEEN CLEARED!');
        console.log('========================================');
        console.log('\n📝 Notes:');
        console.log('   - Database sekarang bersih dari fake orders');
        console.log('   - Hanya order dari MT5 yang akan tercatat');
        console.log('   - Restart backend untuk mulai fresh\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

clearFakeData();
