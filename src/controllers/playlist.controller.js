import mongoose, { isValidObjectId } from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Playlist } from '../models/playlist.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, isPublic } = req.body;

    if (!name?.trim() || !description?.trim()) {
        throw new ApiError(400, 'Name and description are required');
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user._id,
        isPublic
    });

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, 'Playlist created successfully'));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist  ID');
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid  video ID');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to add videos to this playlist');
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found');
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        { $addToSet: { videos: videoId } },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, 'Video added to playlist successfully'));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to remove videos from this playlist');
    }

    const isInPlaylist = playlist.videos.some(id => id.toString() === videoId);

    if (!isInPlaylist) {
        throw new ApiError(404, 'Video not found in the playlist');
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        { $pull: { videos: videoId } },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, 'Video removed from playlist successfully'));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to delete this playlist');
    }

    await Playlist.findOneAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, 'Playlist deleted successfully'));
});

const getMyPlaylists = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const filter = { owner: userId};

    if (cursor) {
        if (!isValidObjectId(cursor)) {
            throw new ApiError(400, 'Invalid cursor ID');
        }
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const playlists = await Playlist.aggregate([
        { $match: filter },
        { $sort: { _id: -1 } },
        { $limit: limitNumber + 1 },
        {
            $addFields: {
                videoCount: { $size: "$videos" }
            }
        },
        {
            $project: {
                videos: 0,
                owner: 0,
            }
        }
    ])

    const hasMore = playlists.length > limitNumber;
    const results = hasMore ? playlists.slice(0, limitNumber) : playlists;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, { playlists: results, nextCursor, hasMore }, 'User playlists fetched successfully'));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const user = await User.findOne({ username });

    const filter = { owner: user._id, isPublic: true };
    if (cursor) {
        if (!isValidObjectId(cursor)) {
            throw new ApiError(400, 'Invalid cursor ID');
        }
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    const playlists = await Playlist.aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $limit: limitNumber + 1 },
        {
            $addFields: {
                videoCount: { $size: "$videos" }
            }
        },
        {
            $project: {
                videos: 0,
                owner: 0,
            }
        }
    ]);

    const hasMore = playlists.length > limitNumber;
    const results = hasMore ? playlists.slice(0, limitNumber - 1) : playlists;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, { playlists: results, nextCursor, hasMore }, 'User playlists fetched successfully'));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }

    const playlist = await Playlist.findById(playlistId)
        .sort({ createdAt: -1 })
        .populate('owner', 'username avatar');

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    const isOwner = req.user && req.user._id.equals(playlist.owner._id);

    if (!playlist.isPublic && !isOwner) {
        throw new ApiError(403, 'You are not authorized to view this playlist');
    }

    const videoFilter = {
        _id: { $in: playlist.videos },
        ...(isOwner ? {} : { isPublished: true })
    };

    if (cursor) {
        if (!isValidObjectId(cursor)) {
            throw new ApiError(400, 'Invalid cursor ID');
        }
        videoFilter._id = { $lt: cursor, ...videoFilter._id };
    }

    const [videos, videoCount] = await Promise.all([
        Video.find(videoFilter)
            .sort({ createdAt: -1 })
            .limit(limitNumber + 1)
            .populate('owner', 'username avatar'),
        Video.countDocuments(videoFilter)
    ]);

    const hasMore = videos.length > limitNumber;
    const results = hasMore ? videos.slice(0, limitNumber) : videos;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, { ...playlist.toObject(), videoCount, videos, nextCursor, hasMore }, 'Playlist fetched successfully'));
});

const togglePlaylistVisibility = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to change the visibility of this playlist');
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        // Evaluated by MongoDB
        [{ $set: { isPublic: { $not: "$isPublic" } } }],
        // Evaluated by Node.js
        // { $set: { isPublic: !playlist.isPublic } },
        { returnDocument: 'after', updatePipeline: true }
    );

    const plainPlaylist = updatedPlaylist.toObject();
    const videoCount = plainPlaylist.videos.length;
    delete plainPlaylist.videos;

    const responsePlaylist = {
        ...plainPlaylist,
        videoCount
    };

    return res
        .status(200)
        .json(new ApiResponse(200, responsePlaylist, 'Playlist visibility toggled successfully'));
})

export {
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    getUserPlaylists,
    getPlaylistById,
    togglePlaylistVisibility,
    getMyPlaylists
}


