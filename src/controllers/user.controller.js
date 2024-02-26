import {asyncHandler} from  '../utils/asynchandler.js';
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/users.model.js"
import {uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser= asyncHandler(async (req, res) =>{
    res.status(200).json({
        message:"ok"
        });

    const {fullname,email,username,password} = req.body
    if(
        [fullname,email,username,password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }

    const existedUser= User.findOne({

        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email ot username already exists")
    }

    const avatarLocalPath= req.files?.avatar[0]?.path;
    const coverImageLocalPath= req.files?.coverImage[0]?.path;

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

   const user= await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering the user")
    }
    
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})
export {registerUser};