import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";

const uploadVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required");
    }

    const cloudinaryVideo = await uploadToCloudinary(videoLocalPath, "video");

    if (!cloudinaryVideo) {
        throw new ApiError(500, "Failed to upload video to cloudinary");
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required");
    }

    const cloudinaryThumbnail = await uploadToCloudinary(thumbnailLocalPath, "image");

    if (!cloudinaryThumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail to cloudinary");
    }

    const video = new Video({
        title,
        description,
        videoFile: cloudinaryVideo.url,
        thumbnail: cloudinaryThumbnail.url,
        duration: cloudinaryVideo.duration,
        owner: req.user._id
    });

    await video.save();

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: { $size: "$subscribers" }
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: { $arrayElemAt: ["$owner", 0] },
                likesCount: { $size: "$likes" },
                isLiked: req.user
                    ? { $in: [req.user._id, "$likes.likedBy"] }
                    : false,
            }
        },
        {
            $project: {
                likes: 0 // Exclude the likes array from the final result
            }
        }
    ])

    if (!video.length) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const filter = { isPublished: true };

    if (cursor) {
        if (!isValidObjectId(cursor)) {
            throw new ApiError(400, "Invalid cursor");
        }
        // added new _id field in the filter object to fetch videos with _id less than the cursor value for pagination
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const videos = await Video.aggregate([
        { $match: filter },
        { $sort: { _id: -1 } },
        { $limit: limitNumber + 1 },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            // Unwind the owner array to get a single object instead of an array
            $addFields: {
                owner: { $arrayElemAt: ["$owner", 0] }
            }
        }
    ])

    const hasMore = videos.length > limitNumber;
    const results = hasMore ? videos.slice(0, limitNumber) : videos;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, {
            videos: results,
            nextCursor,
            hasMore
        },
            "Videos fetched successfully"));
});

const getMyVideos = asyncHandler(async (req, res) => {
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const filter = { owner: req.user._id };

    if (cursor) {
        if (!isValidObjectId(cursor)) {
            throw new ApiError(400, "Invalid cursor");
        }
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const videos = await Video.aggregate([
        { $match: filter },
        { $sort: { _id: -1 } },
        { $limit: limitNumber + 1 },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
            }
        },
        {
            $project: {
                likes: 0
            }
        }
    ]);

    const hasMore = videos.length > limitNumber;
    const results = hasMore ? videos.slice(0, limitNumber) : videos;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, {
            videos: results,
            nextCursor,
            hasMore
        },
            "My videos fetched successfully"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { cursor, limit = 10 } = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const filter = {
        owner: new mongoose.Types.ObjectId(userId),
        isPublished: true
    };

    if (cursor) {
        if (!isValidObjectId(cursor)) {
            throw new ApiError(400, "Invalid cursor");
        }
        filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const videos = await Video.aggregate([
        { $match: filter },
        { $sort: { _id: -1 } },
        { $limit: limitNumber + 1 },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
            }
        },
        {
            $project: {
                likes: 0
            }
        }
    ]);

    const hasMore = videos.length > limitNumber;
    const results = hasMore ? videos.slice(0, limitNumber) : videos;
    const nextCursor = hasMore ? results[results.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, {
            videos: results,
            nextCursor,
            hasMore
        },
            "Channel videos fetched successfully"));

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description, isPublished } = req.body;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title,
            description,
            isPublished
        }
    }, { new: true });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Video deleted successfully"));
})

const toggleVideoPublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, { isPublished: video.isPublished }, "Video publish status updated successfully"));
})

export {
    uploadVideo,
    getVideoById,
    getAllVideos,
    getMyVideos,
    getChannelVideos,
    updateVideo,
    deleteVideo,
    toggleVideoPublishStatus
}