import mongoose, { isValidObjectId } from 'mongoose';
import { Like } from '../models/like.model.js';
import { Video } from '../models/video.model.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.exists({ _id: videoId });

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id });

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: false }, "Video like removed successfully"));
    } 

    try{
        await Like.create({ video: videoId, likedBy: req.user._id });
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: true }, "Video liked successfully"));
    } catch (error) {
        // Handle duplicate key error (E11000) when trying to create a like that already exists
        //Here's the scenario: two requests hit "like this video" at almost the exact same time (like a double-tap). Both check "has this user liked it already?" — both see "no." Both try to create a like. But your database has a rule (unique index) saying "one user can only like a video once." So the second Like.create() fails — not because something's actually wrong, but because the first request already did the job.
        //If this specific error (code 11000, duplicate) happens, don't treat it as a failure — just tell the user 'yep, you liked it,' because that's already true.
        if(error.code === 11000) {
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: true }, "Video liked successfully"));
        }
        throw new ApiError(500, "Error occurred while toggling video like");
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.exists({ _id: commentId });

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id });

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: false }, "Comment like removed successfully"));
    }

    try {
        await Like.create({ comment: commentId, likedBy: req.user._id });
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: true }, "Comment liked successfully"));
    } catch (error) {
        if(error.code === 11000) {
            return res
                .status(200)
                .json(new ApiResponse(200, { liked: true }, "Comment liked successfully"));
        }
        throw new ApiError(500, "Error occurred while toggling comment like");
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.exists({ _id: tweetId });

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user._id });

    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id });
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: false }, "Tweet like removed successfully"));
    }

    try {
        await Like.create({ tweet: tweetId, likedBy: req.user._id });
        return res
            .status(200)
            .json(new ApiResponse(200, { liked: true }, "Tweet liked successfully"));
    } catch (error) {
        if(error.code === 11000) {
            return res
                .status(200)
                .json(new ApiResponse(200, { liked: true }, "Tweet liked successfully"));
        }
        throw new ApiError(500, "Error occurred while toggling tweet like");
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    if (cursor && !isValidObjectId(cursor)) {
        throw new ApiError(400, "Invalid cursor");
    }

    const filter = { likedBy: req.user._id, video: { $exists: true } };

    if (cursor) {
        filter._id = { $lt: cursor };
    }

    const likes = await Like.find(filter)
        .sort({ _id: -1 })
        .limit(limitNumber + 1)
        .populate({ path: 'video' , match: { isPublished: true }});
        //path: 'video' is the field in the Like model that references the Video model. By specifying this path, we are telling Mongoose to fetch the associated video document for each like. The match option is used to filter the populated documents based on certain criteria. In this case, we only want to populate videos that are published (isPublished: true). This ensures that we only get likes for videos that are currently available to users.

    const validLikes = likes.filter(like => like.video !== null);

    const hasMore = validLikes.length > limitNumber;
    const results = hasMore ? validLikes.slice(0, limitNumber) : validLikes;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    const likedVideos = results.map(like => like.video);

    return res
        .status(200)
        .json(new ApiResponse(200, { 
            videos: likedVideos,
            nextCursor, 
            hasMore 
        }, 
        "Liked videos fetched successfully"));
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}