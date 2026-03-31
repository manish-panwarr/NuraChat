import React from "react";

function SideImage(props) {
  return (
    <div className="h-full w-[90%] flex items-center p-3">
      {/* ✅ When using public folder, use absolute path starting with '/' */}
      <img
        src={props.img}
        alt="Login Visual"
        className="h-full w-[100%] object-cover object-center rounded-4xl"
      />
    </div>
  );
}

export default SideImage;
