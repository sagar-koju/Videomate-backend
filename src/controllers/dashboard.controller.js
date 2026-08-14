import mongoose, {isValidObjectId} from 'mongoose';
import {Video} from '../models/video.model.js';
import {User} from '../models/user.model.js';
import {Subscription} from '../models/subscription.model.js';
import {Like} from '../models/like.model.js';
import {ApiError} from '../utils/ApiError.js';
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiResponse} from '../utils/ApiResponse.js';

const getDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const totalSubscribers = await Subscription.countDocuments({ subscribedTo: userId });
    const totalSubscriptions = await Subscription.countDocuments({ subscriber: userId });
    const totalLikes = await Like.countDocuments({ likedBy: userId });
    const totalVideos = await Video.countDocuments({ owner: userId });

    return res
        .status(200)
        .json(new ApiResponse(200, { totalSubscriptions, totalLikes, totalVideos }, "Dashboard stats fetched successfully"));
})

const getUploadedVideos = asyncHandler(async (req, res) => {
    // query parameters
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const filter = { owner: { $ne: req.user._id }, isPublished: true };

    // here cursor is the _id of the last video fetched in the previous request, used for pagination. 
    if (cursor) {
        if(!isValidObjectId(cursor)) {
            throw new ApiError(400, "Invalid cursor");
        }
        // added new _id field in the filter object to fetch videos with _id less than the cursor value for pagination
        filter._id = { $lt: cursor };
    }

    const videos = await Video.find(filter)
        .sort({ _id: -1 })
        .limit(limitNumber + 1)
        .populate('owner', 'username avatar fullName');

    const hasMore = videos.length > limitNumber;
    const results = hasMore ? videos.slice(0, limitNumber) : videos;
    const nextCursor = results.length > 0 ? results[results.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, { 
            videos: results, 
            nextCursor, 
            hasMore 
        }, 
        "Videos fetched successfully"));
});

export {
    getDashboardStats,
    getUploadedVideos
}