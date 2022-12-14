// Post Point of Interests
// left right
// https://google.github.io/mediapipe/solutions/pose.html

const PPoI = {
    "elbow": [13, 14],
    "shoulder": [11, 12],
    "wrist": [15, 16],
};

let internal_counter2 = 0.0; 

function getShoulderRot(pose, leftright)
{

    //=======================================================
    //test용 코드 
    
    internal_counter2 += 0.1; 
    if (internal_counter2 > Math.PI)
    {
        internal_counter2 = 0.0;
    }
    //internal_counter2 = internal_counter2  / Math.PI; 
    return [0.0, internal_counter2, 0.0];
    
    //=======================================================

    //================================================
    /*
    let shoulder = pose["shoulder"][leftright];
    // let elbow = pose["elbow"][leftright];
    // let pitch = 0.0;
    // let yaw = 0.0;
    // let roll = 0.0;

    console.log("++++++++++어깨 각도 계산++++++++++");  
    console.log(shoulder);

    let rollSlope = slope(0, 1, shoulder[1], shoulder[0]);
    let roll = Math.atan(rollSlope);
    let yawSlope = slope(0, 2, shoulder[1], shoulder[0]);
    let yaw = Math.atan(yawSlope);
    let pitchSlope = slope(2, 1, shoulder[2], shoulder[3]);
    let pitch = Math.atan(pitchSlope);
    if(pitch > 0){
        pitch -= Math.PI;
    }
    return [roll, pitch + Math.PI / 2, yaw];

    */





    //==========================================
    /*
    let rollSlope = slope(0, 1, head[1], head[0]);
    let roll = Math.atan(rollSlope);
    let yawSlope = slope(0, 2, head[1], head[0]);
    let yaw = Math.atan(yawSlope);
    let pitchSlope = slope(2, 1, head[2], head[3]);
    let pitch = Math.atan(pitchSlope);
    if(pitch > 0){
        pitch -= Math.PI;
    }
    return [roll, pitch + Math.PI / 2, yaw];
    */

    /*
    let rollSlope = slope(0, 1, hand[i1][0], hand[i0][0]);
    let roll = Math.atan(rollSlope);
    let yawSlope = slope(0, 2, hand[i1][0], hand[i0][0]);
    let yaw = Math.atan(yawSlope);
    if((hand[i1][0][0] > hand[i0][0][0]) != (prefix == "right")){
        roll *= -1;
        yaw -= Math.PI * lrRatio;
    }
    let pitchSlope = slope(2, 1, hand[i2][0], hand[i3][0]);
    let pitch = Math.atan(pitchSlope) + Math.PI / 2;
    if(pitch > Math.PI / 2){
        pitch -= Math.PI;
    }
    if(hand[i2][0][1] > hand[i3][0][1]){
        pitch -= Math.PI;
    }
    */

    // return [pitch, yaw, roll]; 

}


function getElbowRot(pose, leftright)
{


    return [pitch, yaw, roll]; 

}



function getHandRot(pose, leftright)
{


    return [pitch, yaw, roll]; 

}





function getElbowUpFront(pose, leftright){
    let shoulder = pose["shoulder"][leftright];
    let elbow = pose["elbow"][leftright];
    let d = distance3d(shoulder, elbow);
    let up = (shoulder[1] - elbow[1]) / d;
    let front = (shoulder[2] - elbow[2]) / d;
    return [up, front];
}

// Down   //    0   0  70 //  -20 -30  10
// Down/2 //    0   5  65 //  -10 -85   5
// Middle //    0  10  60 //    0 -140  0
// Up/2   //    0 -30  -5 //    0 -80 -40
// Up     //    0 -70 -70 //    0 -10   0

function getWristXYZ(pose, leftright){
    let base = distance3d(pose["shoulder"][0], pose["shoulder"][1]) * 1.2;
    let shoulder = pose["shoulder"][leftright];
    let wrist = pose["wrist"][leftright];
    let x = Math.max(-1, Math.min(1, (shoulder[0] - wrist[0]) / base));
    let y = Math.max( 0, Math.min(1, (shoulder[1] - wrist[1]) / base / 2 + 0.5));
    let z = +(wrist[2] > shoulder[2]);
    return [x, y, z];
}

function getTiltLean(shoulder){
    let d = distance3d(shoulder[0], shoulder[1]);
    let tilt = (shoulder[0][1] - shoulder[1][1]) / d;
    let lean = (shoulder[0][2] - shoulder[1][2]) / d;
    return [tilt, lean * Math.sqrt(Math.abs(lean))];
}


//==================================================
//주요 각도를 mediapipe 값으로부터 맵핑시키는 함수 

function pose2Info(pose){
    let keyInfo = {};
    let tl = getTiltLean(pose["shoulder"]);
    let lwrist = getWristXYZ(pose, 0);
    let rwrist = getWristXYZ(pose, 1);
    keyInfo["tilt"] = tl[0];
    keyInfo["lean"] = tl[1];
    keyInfo["leftWristX"] = lwrist[0];
    keyInfo["leftWristY"] = lwrist[1];
    keyInfo["rightWristX"] = rwrist[0];
    keyInfo["rightWristY"] = rwrist[1];

    //==================================
    //3개의 회전 정보 추가 
    let lshoulder = getShoulderRot(pose, 0);
    //let rshoulder = getShoulderRot(pose, 1);

    // let lelbow = getElbowRot(pose, 0);
    // let relbow = getElbowRot(pose, 1);

    // let lhand = getHandRot(pose, 0);
    // let rhand = getHandRot(pose, 1);
      
    
    keyInfo['leftShoulder_pitch'] = lshoulder[0];
    keyInfo['leftShoulder_yaw']   = lshoulder[1];
    keyInfo['leftShoulder_roll']  = lshoulder[2]; 

    // console.log("before >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    // console.log(keyInfo);

    // keyInfo["leftShoulder_pitch"] = 0.75;
    // keyInfo['leftShoulder_yaw']   = 0.75;
    // keyInfo['leftShoulder_roll']  = 0.75; 

    // console.log("after >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    // console.log(keyInfo);

    // keyInfo['rightShoulder_pitch'] = rshoulder[0];
    // keyInfo['rightShoulder_yaw']   = rshoulder[1];
    // keyInfo['rightShoulder_roll']  = rshoulder[2];

    // keyInfo['LeftLowerArm_pitch'] = lelbow[0];
    // keyInfo['LeftLowerArm_yaw']   = lelbow[1];
    // keyInfo['LeftLowerArm_roll']  = lelbow[2];

    // keyInfo['RightLowerArm_pitch'] = relbow[0]; 
    // keyInfo['RightLowerArm_yaw']   = relbow[1]; 
    // keyInfo['RightLowerArm_roll']  = relbow[2]; 

    // keyInfo['LeftHand_pitch'] =  lhand[0];   
    // keyInfo['LeftHand_yaw']   =  lhand[1];
    // keyInfo['LeftHand_roll']  =  lhand[2];

    // keyInfo['RightHand_pitch'] =  rhand[0];   
    // keyInfo['RightHand_yaw']   =  rhand[1];   
    // keyInfo['RightHand_roll']  =  rhand[2];   

    //=========================================

    return keyInfo;
}

function packPoseHolistic(_pose){
    let wh = getCameraWH();
    function pointUnpack(p){
        return [p.x * wh[0], p.y * wh[1], p.z * wh[1]];
    }
    let ret = {};
    Object.keys(PPoI).forEach(function(key){
        ret[key] = [];
        for(let i = 0; i < PPoI[key].length; i++){
            ret[key][i] = pointUnpack(_pose[PPoI[key][i]]);
        }
    });
    return ret;
}