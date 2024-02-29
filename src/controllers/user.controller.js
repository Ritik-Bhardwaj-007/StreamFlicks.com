import {asyncHandler} from  '../utils/asynchandler.js';
import {ApiError} from "../utils/ApiError.js"
import User  from "../models/users.model.js"
import uploadOnCloudinary from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const generateAccessandRefreshToken = async (userId) =>{
const user = await User.findById(userId);
console.log(user.schema.methods);
const accessToken=await user.schema.methods.generateAccessToken();
const refreshToken= await user.schema.methods.generateRefreshToken();

user.refreshToken=refreshToken;
console.log(user);
await user.save({validateBeforeSave:false})

return {accessToken,refreshToken};
}
const registerUser= asyncHandler(async (req, res) =>{

    const {fullname,email,username,password} = req.body
    if(
        [fullname,email,username,password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }

    const existedUser= await User.findOne({

        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email ot username already exists")
    }

    const avatarLocalPath= req.files?.avatar[0]?.path;
    // const coverImageLocalPath= req.files?.coverImage[0]?.path;
     
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length > 0){
        
        coverImageLocalPath= req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
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

const loginUser= asyncHandler(async (req,res)=>{
 const {username,email,password}=req.body;

 if(!username && !email){
    throw new ApiError(400, "Username or Email field is missing");
 }
 const user= await User.findOne({
    $or:[{username},{email}]
 })

 if(!user){
    throw new ApiError(401,"user does not exists")
 }

 const isPasswordValid= await user.isPasswordCorrect(password);

 if(!isPasswordValid){
    throw new ApiError(401,"Invalid credentials")
 }

 const {refreshToken,accessToken} =await generateAccessandRefreshToken(user._id)

 const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

 const options= {
    httpOnly:true,
    secure:true
 }

 res.status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",refreshToken,options)
 .json(
    new ApiResponse(200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "User logged In Successfully !"
        )
 )
})

const logoutUser= asyncHandler(async(req,res,next)=>{
  await User.findByIdAndUpdate(req.user._id,
    
    {
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })
    const options= {
        httpOnly:true,
        secure:true
     }
     return res.status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new ApiResponse(200,{},"User Logged out Successfully"))
})
const refreshAccessToken= asyncHandler(async (req,res,next)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401," Unauthorized Request")
    }
    try {
        const decodedRefreshToken= jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        const user=await User.findById(decodedRefreshToken?._id);
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken!== user?.refreshToken){
            throw new ApiError(401," refresh token is expired or used ")
        }
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken,refreshToken}=await generateAccessandRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,refreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})
const changeCurrentUserPassword= asyncHandler(async (req,res,next)=> {
    const {oldPassword,newPassword} = req.body;
    const user= await User.findById(req.user?._id);
    const isPasswordCorrect= user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401,'Wrong old password')
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false});

    return res
    .status(200)
    .json(
        new ApiResponse(200,{}," Password Changed Successfully ")
    )
})
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(200,req.user,"current user fetched successfully ")
})
const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullname,email} = req.body;
    if(!fullname || !email){
        throw new ApiError(400,"All fields are required");
    }
    const user = User.findByIdAndUpdate(req.user?._id,
        {
         $set:{
            fullname,
            email
         }
        },
        {
          new: true 
        }
        ).select("-password")

        return res
        .status(200)
        .json( new ApiResponse(200,user,"Account Details Updated Successfully "))
})
const updateUserAvatar= asyncHandler(async (req,res)=>{
    const avatarLocalPath= req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
   const avatar= await uploadOnCloudinary(avatarLocalPath);

   if(!avatar.url){
    throw new ApiError(400,"Error While Uploading Avatar")
   }

   const user= await User.findByIdAndUpdate(req.user._id,{
   $set:{
    avatar:avatar.url
   }
   },{
    new:true
   }).select("-password")
 
   return res
   .status(200)
   .json(
   new ApiResponse(200,user,"Avatar Updated Successfully ")
   )
})
const updateUserCoverImage= asyncHandler(async (req,res)=>{
    const coverImageLocalPath= req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }
   const coverImage= await uploadOnCloudinary(coverImageLocalPath);

   if(!coverImage.url){
    throw new ApiError(400,"Error While Uploading Cover Image")
   }

   const user =await User.findByIdAndUpdate(req.user._id,{
   $set:{
    coverImage:coverImage.url
   }
   },{
    new:true
   }).select("-password")
 
   return res
   .status(200)
   .json(
   new ApiResponse(200,user,"Cover Image Updated Successfully ")
   )
})
 const getUserChannelProfile= asyncHandler(async(req,res)=>{
       const {username} = req.params;
       if(!username){
        throw new ApiError(400,'Username Is Missing')
       }
       const channel= await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"                
            }
        },
        {
            $lookup:{
                from :"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
               subscribersCount:{
                $size:"$subscribers"
               },
               channelsSubscribedTOCount:{
                $size:"$subscribedTo"
               },
               isSubscribed:{
                 $cond:{
                    if:{
                        $in:[req.user?._id,"$subscribers.subscriber"]  
                    },
                    then:true,
                    else:false
                 }
               }
            }
        },
        {
         $project:{
            fullname:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedTOCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1,
         }
        }
       ])
       if(!channel?.lenght){
        throw new ApiError(404,"channel doesn't exists")
       }

       return  res.status(200).json(
        new ApiResponse(200,channel[0],"user channel fetched Successfully ")
       )
 })
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
};