import React from "react";
import { useState } from "react";
import { Skeleton } from "@mui/material";
function LoadingImage({ ...props }) {
  const [loading, setLoading] = useState(true);

  const handleImageLoad = () => {
    setLoading(false);
  };

  return (
    <>
      {loading && <Skeleton variant="rounded" height={120} width={120} />}
      <img
        {...props}
        style={{ display: loading ? "none" : "block", ...props.style, marginTop:'5px' }}
        onLoad={handleImageLoad}
      />
    </>

  );
}

export default LoadingImage;
