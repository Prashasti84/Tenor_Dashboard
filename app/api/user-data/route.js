import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// MongoDB connection function
async function connectToMongoDB(username) {
    try {
        // Connect to MongoDB using the provided connection string
        await mongoose.connect('mongodb+srv://Prashasti84:Prashasti%4084@cluster0.qamwv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        
        // Get data from the user-specific database
        const dbName = `tenor_database_${username}`;
        return mongoose.connection.useDb(dbName);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');
        
        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        // Connect to the specific database
        const db = await connectToMongoDB(username);
        
        // Get rankings from gif_rankings collection
        const rankings = await db.collection('gif_rankings')
            .find({})
            .sort({ last_updated: -1 })
            .toArray();

        // Close the connection
        await mongoose.connection.close();

        // Calculate some statistics
        const totalGifs = rankings.length;
        const currentDate = new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).replace(/\//g, '-');

        // Transform the data if needed
        const transformedRankings = rankings.map(ranking => ({
            ...ranking,
            last_updated: ranking.last_updated || currentDate,
            current_rank: ranking.updated_rank || ranking.current_rank || 0
        }));

        // Send the response
        return NextResponse.json({
            success: true,
            rankings: transformedRankings,
            metadata: {
                totalGifs,
                lastUpdate: currentDate,
                username
            }
        });

    } catch (error) {
        console.error('Error in API route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

// Optional: Add error handling middleware
export function middleware(request) {
    return NextResponse.next();
}

// Optional: Configure cors if needed
export const config = {
    api: {
        externalResolver: true,
    },
};