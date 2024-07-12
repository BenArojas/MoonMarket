import React from 'react'
import Starfield from 'react-starfield';
import "@/styles/moon.css"

const Moon = () => {
  return (
    // <div className="moon">
    //css made moon
    //   <div className="crater crater-1"></div>
    //   <div className="crater crater-2"></div>
    //   <div className="crater crater-3"></div>
    // </div>
    <div className='moon-container'>
      <img
        src="/RealMoon.png"
        alt="Detailed moon"
        className="moon"
      />
    </div>
  );
};

function Space() {
  return (
    <div className="space-container">
      <Starfield
        starCount={2000}
        starColor={[255, 255, 255]}
        speedFactor={0.05}
        backgroundColor="black"
      />
      <Moon />
    </div>
  )
}

export default Space