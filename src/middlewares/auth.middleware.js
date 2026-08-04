import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async (req, _, next) => {
    console.log('Cookies:', req.cookies);
    console.log('Authorization Header:', req.headers.authorization);

    const token = req.cookies?.accessToken || req.headers.authorization?.replace("Bearer ", "")

    if (!token) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        console.log('Decoded:', decoded)
        req.user = decoded
        next()
    } catch (err) {
        console.log('JWT verify error:', err.message) // <-- this is key
        return res.status(401).json({ message: "Unauthorized - invalid token" })
    }
})