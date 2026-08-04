import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";



const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "Full name and email are required");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true,
        }
    ).select("-password ");

    return res
    .status(200)
    .json(new ApiResponse(
        200, 
        user, 
        "Account details updated successfully"
    ))
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar to cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"))
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required");
    }

    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(500, "Failed to upload cover image to cloudinary");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");
    
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"))
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    // trim the username to remove any leading or trailing whitespace and check if it's empty or undefined
    if(!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    //MongoDB aggregation pipeline to fetch user channel profile based on the provided username. 
    const channel = await User.aggregate([
        {
            $match: { 
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedChannels"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                subscribedChannelsCount: { $size: "$subscribedChannels" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                subscribedChannelsCount: 1,
                isSubscribed: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    if(!channel?.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"))

});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchedHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }

                ] 
            }
        }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, user[0]?.watchedHistory || [], "Watch history fetched successfully"))
});

export {
    updateAccountDetails,
    updateCoverImage,
    updateAvatar,
    getUserChannelProfile,
    getWatchHistory
};