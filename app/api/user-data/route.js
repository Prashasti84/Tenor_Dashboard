import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://Prashasti84:Prashasti%4084@cluster0.qamwv.mongodb.net/Cluster0?retryWrites=true&w=majority';

async function connectToMongoDB(username) {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        
        const dbName = `tenor_gif_database_${username}`;
        console.log('Connecting to database:', dbName);
        
        await mongoose.connect(MONGODB_URI, {
            dbName: dbName
        });
        
        return mongoose.connection.db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        let username = searchParams.get('username');
        
        if (!username) {
            throw new Error('Username is required');
        }

        username = username.toLowerCase().replace('https://tenor.com/users/', '');
        
        const db = await connectToMongoDB(username);
        
        const rankings = await db.collection('gif_rankings')
            .find({})
            .sort({ _id: 1 })
            .toArray();

        console.log(`Found ${rankings.length} rankings for ${username}`);

        // Updated ranking transformation logic to handle all possible field names
        const formattedRankings = rankings.map(rank => {
            // Extract rank value checking all possible field names
            let rankValue = null;
            if (rank.updated_rank !== undefined) rankValue = rank.updated_rank;
            else if (rank.current_rank !== undefined) rankValue = rank.current_rank;
            else if (rank.rank !== undefined) rankValue = rank.rank;
            else if (rank.position !== undefined) rankValue = rank.position;

            // Format rank value
            let formattedRank = '#NOT_FOUND';
            if (rankValue !== null) {
                // Convert to string and ensure # format
                formattedRank = rankValue.toString();
                formattedRank = formattedRank.startsWith('#') ? formattedRank : `#${formattedRank}`;
            }

            return {
                _id: rank._id.toString(),
                gif_url: rank.gif_url || rank.url || rank.gifUrl || '',
                search_term: rank.search_term || rank.searchTerm || rank.term || '',
                updated_rank: formattedRank,
                filter_keyword: rank.filter_keyword || rank.keyword || rank.filterKeyword || '',
                last_updated: rank.last_updated || rank.lastUpdated || rank.update_date || 
                            new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
            };
        });

        const stats = {
            totalGifs: formattedRankings.length.toString(),
            pendingGifs: '0',
            completedGifs: formattedRankings.length.toString(),
            lastUpdate: formattedRankings[0]?.last_updated || 'N/A',
            processingStatus: 'active'
        };

        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        return NextResponse.json({
            success: true,
            rankings: formattedRankings,
            stats
        });

    } catch (error) {
        console.error('API Error:', error);
        
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        return NextResponse.json({
            success: false,
            error: error.message,
            rankings: [],
            stats: {
                totalGifs: '0',
                pendingGifs: '0',
                completedGifs: '0',
                lastUpdate: 'N/A',
                processingStatus: 'error'
            }
        });
    }
}