import {v2 as cloudinary } from "cloudinary"
import fs, { fchmod } from "fs"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary= async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath,
            {
                resource_type:"auto",
            });
            // console.log("Image uploaded to Cloudinary!",response.url);
            fs.unlinkSync(localFilePath);//delete the local file after it has been uploaded
            return response;
        } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
}

export  default uploadOnCloudinary;