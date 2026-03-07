const jwt = require("jsonwebtoken");
const generateAccessToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRE || "15m" });
const generateRefreshToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" });
const setTokenCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("accessToken", accessToken, { httpOnly: true, secure: isProd, sameSite: "strict", maxAge: 15*60*1000 });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: isProd, sameSite: "strict", maxAge: 7*24*60*60*1000, path: "/api/auth/refresh" });
};
module.exports = { generateAccessToken, generateRefreshToken, setTokenCookies };
