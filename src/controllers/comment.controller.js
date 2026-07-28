import {ApiResponse} from "../utils/ApiResponse.js";
import {ApiError} from "../utils/ApiError.js";
import {Comment} from "../models/comment.model.js";
import {Video} from "../models/video.model.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose, {isValidObjectId} from "mongoose";

const commentOnVideo = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {content} = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Content is required");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "Video not found");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (!video.isPublished) {
        throw new ApiError(403, "Video not found");
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: videoId,
        owner: req.user._id
    });

    const populatedComment = await comment.populate("owner", "username avatar fullName")

    console.log("comment:", comment);
    return res
        .status(201)
        .json(new ApiResponse(201, populatedComment, "Comment created successfully"));
});

const editComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;
    const {content} = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Content is required");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(404, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this comment");
    }

    comment.content = content.trim();
    await comment.save();

    const populatedComment = await comment.populate("owner", "username avatar fullName");

    return res
        .status(200)
        .json(new ApiResponse(200, populatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not the owner of this comment");
    }

    await Comment.findByIdAndDelete(commentId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {cursor, limit = 10} = req.query;
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    if(cursor && !isValidObjectId(cursor)) {
        throw new ApiError(400, "Invalid cursor");
    }
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const filter = { video: videoId };
    if (cursor) {
        filter._id = { $lt: cursor };
    }


    // fetch comments in descending order because we want the latest comments first, and limit the number of comments fetched to limitNumber + 1 to check if there are more comments available for pagination.
    const [comments, totalComments] = await Promise.all ([
        Comment.find(filter)
            .sort({ _id: -1 })
            .limit(limitNumber + 1)
            .populate("owner", "username avatar fullName")
            .lean(),
        Comment.countDocuments({ video: videoId })
        // .lean() is used to return plain JavaScript objects instead of Mongoose documents, which can improve performance and reduce memory usage when you don't need the full functionality of Mongoose documents.
    ]);
    const hasMore = comments.length > limitNumber;
    if (hasMore) {
        comments.pop(); // Remove the last comment to exclude it from the results
    }

    const nextCursor = hasMore ? comments[comments.length - 1]._id : null;

    return res
        .status(200)
        .json(new ApiResponse(200, { comments,hasMore, nextCursor }, "Comments fetched successfully"));
});

const replyToComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const {content} = req.body;

    if (!content.trim()) {
        throw new ApiError(400, "Content is required");
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const reply = new Comment({
        content: content.trim(),
        owner: req.user._id,
        video: comment.video,
        parentComment: commentId
    });

    await reply.save();

    const populatedReply = await reply.populate("owner", "username avatar fullName");

    return res
        .status(201)
        .json(new ApiResponse(201, populatedReply, "Reply added successfully"));
})

export {
    commentOnVideo,
    editComment,
    deleteComment,
    getVideoComments,
    replyToComment
}