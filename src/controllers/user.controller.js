import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating access and refresh tokens:", error);
        throw new ApiError(500, "Failed to generate access and refresh tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, username, email, password } = req.body;
    if (
        [fullName, username, email, password].some(field => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }
    const userExists = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (userExists) {
        throw new ApiError(409, "Username or email already exists");
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new ApiError(400, "Invalid email format");
    }
    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar to cloudinary");
    }

    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadToCloudinary(coverImageLocalPath);
    }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Failed to register user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if ([email, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "Email and password are required");
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
        throw new ApiError(401, "User does not exist");
    }
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid email or password");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const userData = await User.findById(user._id).select("-password -refreshToken");

    // Set the access and refresh tokens in HTTP-only cookies i.e. it is only modifiable by the server and not accessible via JavaScript on the client side, enhancing security against XSS attacks.
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: userData, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            },

        },
        {
            new: true,
        },
    )
    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!incomingRefreshToken) {
        console.error("Refresh token is required");
        throw new ApiError(401, "Unauthorized request");
    }
    let decodedToken;
    try {
        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

    } catch (error) {
        console.error("Error verifying refresh token:", error);
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decodedToken._id);

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const options = {
        httpOnly: true,
        secure: true
    };

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access token refreshed successfully"
            )
        )
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Current password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

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

    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true,
        }
    );

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

    await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true,
        }
    );
    
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
                _id: mongoose.Types.ObjectId(req.user?._id)
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
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateCoverImage,
    updateAvatar,
    getUserChannelProfile,
    getWatchHistory
};