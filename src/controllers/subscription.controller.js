import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose, { isValidObjectId } from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    if (channelId === req.user?._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    });

    if (existingSubscription) {
        await Subscription.deleteOne({ _id: existingSubscription._id });
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Successfully unsubscribed from the channel"));
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Successfully subscribed to the channel"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriptions = await Subscription.find({ subscriber: req.user?._id }).populate("channel", "username fullName avatar");

    const channels = subscriptions.map(subscription => subscription.channel);

    return res
        .status(200)
        .json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"));

    //aggregate method to get subscribed channels with channel info
    // const subscriptions = await Subscription.aggregate([
    //     {
    //         $match: { 
    //             subscriber: new mongoose.Types.ObjectId(req.user?._id) 
    //         },
    //     },
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: "channel",
    //             foreignField: "_id",
    //             as: "channelInfo",
    //             pipeline: [
    //                 {
    //                     $project: {
    //                         _id: 1,
    //                         fullName: 1,
    //                         username: 1,
    //                         avatar: 1,
    //                     }
    //                 }
    //             ]
    //         }
    //     },
    //     {
    //         $addFields: {
    //             channelInfo: { $first: "$channelInfo" }
    //         }
    //     },
    //     {
    //       $replaceRoot: { newRoot: "$channelInfo" }
    //     }
    // ])
    // return res
    //     .status(200)
    //     .json(new ApiResponse(200, subscriptions, "Subscribed channels fetched successfully"));
});

export {
    toggleSubscription,
    getSubscribedChannels
};