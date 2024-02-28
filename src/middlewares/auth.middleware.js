import User from "../models/users.model.js";
import { asyncHandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js"

export const verifyJWT= asyncHandler(async (req,res,next)=>{
   try {
     const token = req.cookies?.accessToken || req.headers("Authorization")?.replace("Bearer ","")
     if(!token){
         throw new ApiError(401,"Unauthorized request")
     }
     console.log(process.env.ACCESS_TOKEN_SECRET);
     const decodedToken= jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
 
     const user= User.findById(decodedToken?._id).select("-password -refreshToken");
 
     if(!user){
         throw new ApiError(401,'Invalid Access Token')
     }
     req.user=user;
     next();
   } catch (error) {
     throw new ApiError(401,error?.message || "Invalid  access token")
   }
})

