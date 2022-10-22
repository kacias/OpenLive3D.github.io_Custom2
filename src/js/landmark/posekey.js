// Post Point of Interests
// left right
// https://google.github.io/mediapipe/solutions/pose.html

const PPoI = {
    "elbow": [13, 14],
    "shoulder": [11, 12],
    "wrist": [15, 16],
};

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

//===========================================================================================================================================================
//손 부분 각도만 가져오는 함수 Pose에는 mediapipe에서 가져오는 좌표가 담겨져 있음. 이로부터 pitch, yaw, roll을 계산해서 리턴, 
//대략 아래와 같은 느낌? 정확하지 않음.  
//이런 스타일로, shoulderRot, ElbowRot 2개의 함수를 추가해야 할 듯. 
//이 구조가 맞다면 총 3개의 함수만 만들면 되지 않을까 싶음. 
//총 3개의 함수에서 mediapipe 값으로 yaw, pitch, roll 값을 계산해서, 6개의 bone에 매핑시키는 형태로.

/*
function getHandRot(pose, leftright)
{

    let hand = pose["hand"][leftright];
    let elbow = pose["elbow"][leftright];
    let x = Math.max(-1, Math.min(1, (hand[0] - elbow[0]) / base));
    let y = Math.max( 0, Math.min(1, (hand[1] - elbow[1]) / base / 2 + 0.5));
    let z = +(elbow[2] > hand[2]);

    return [pitch, yaw, roll]; 

}
*/

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


    //여기에 새로운 key 값들을 배정하는 듯 
    //let lhand = getHandRot(pose, 0);
    //keys['LeftHand_pitch'] = lhand[0]  
    //keys['LeftHand_yaw'] = lhand[1]  
    //keys['LeftHand_roll'] = lhand[2]  

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