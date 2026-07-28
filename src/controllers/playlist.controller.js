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

const getUserPlaylists = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const playlists = await Playlist.find({ owner: userId })
    .sort({ createdAt: -1 })

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, 'User playlists fetched successfully'));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlist ID');
    }

    const playlist = await Playlist.findById(playlistId)
        .sort({ createdAt: -1 })
        .populate('videos')
        .populate('owner', 'username avatar');

    if (!playlist) {
        throw new ApiError(404, 'Playlist not found');
    }

    if
    (
        playlist.isPublic === false && 
        (!req.user ||playlist.owner.toString() !== req.user._id.toString())
    ) {
        throw new ApiError(403, 'You are not authorized to view this playlist');
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, 'Playlist fetched successfully'));
})

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
        [{ $set: { isPublic: {$not: "$isPublic"} } }],
        // Evaluated by Node.js
        // { $set: { isPublic: !playlist.isPublic } },
        { returnDocument: 'after', updatePipeline: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, 'Playlist visibility toggled successfully'));
})

export {
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    getUserPlaylists,
    getPlaylistById,
    togglePlaylistVisibility
}


