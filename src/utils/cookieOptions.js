const baseCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
};

export const accessTokenCookieOptions = {
    ...baseCookieOptions,
    //if you update here make sure to update the .env file value for ACCESS_TOKEN_EXPIRES_IN as well
    maxAge: 15 * 60 * 1000, // 15 minutes
};

export const refreshTokenCookieOptions = {
    ...baseCookieOptions,
    //if you update here make sure to update the .env file value for REFRESH_TOKEN_EXPIRES_IN
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
};
