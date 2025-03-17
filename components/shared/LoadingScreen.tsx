"use client";

import React from "react";

const LoadingScreen = () => {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center space-y-4">
                <div className="relative h-16 w-16">
                    <div className="absolute h-16 w-16 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-blue-200 border-l-blue-200 animate-spin"></div>
                </div>
                <h2 className="text-xl font-medium text-gray-700">Loading your portal</h2>
                <p className="text-sm text-gray-500">Please wait while we prepare everything for you</p>
            </div>
        </div>
    );
};

export default LoadingScreen;