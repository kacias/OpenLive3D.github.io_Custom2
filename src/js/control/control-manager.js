// global scene, light, and clock variable
let scene = new THREE.Scene();
let light = new THREE.DirectionalLight(0xffffff);
light.position.set(0.0, 1.0, -1.0).normalize();
scene.add(light);
let clock = new THREE.Clock();
clock.start();

// config
let Tvrmsbspn = THREE_VRM.VRMExpressionPresetName;
let Tvrmshbn = THREE_VRM.VRMHumanBoneName;
let cm = getCM(); // required for ConfigManager Setup
let currentVrm = undefined;
let defaultXYZ = undefined;

let internal_counter = 0.0; 

// initialize / reinitialize VRM
function loadVRM(vrmurl){
    loadVRMModel(vrmurl,
        function(vrm){
            if(currentVrm){
                scene.remove(currentVrm.scene);
                THREE_VRM.VRMUtils.deepDispose(currentVrm.scene);
            }
            currentVrm = vrm;
            scene.add(vrm.scene);
            let head = currentVrm.humanoid.getNormalizedBoneNode(Tvrmshbn.Head);
            let foot = currentVrm.humanoid.getNormalizedBoneNode(Tvrmshbn.LeftFoot);
            let pos = {
                "x": head.up.x + head.position.x,
                "y": head.up.y + head.position.y - foot.position.y,
                "z": head.up.z + head.position.z
            };
            resetCameraPos(pos);
            resetVRMMood();
            createMoodLayout();
            let hips = currentVrm.humanoid.getNormalizedBoneNode(Tvrmshbn.Hips).position;
            defaultXYZ = [hips.x, hips.y, hips.z];
            console.log("vrm model loaded");
            console.log(currentVrm);
        });
    setMood(getCMV('DEFAULT_MOOD'));
}

// initialize the control
function initialize(){

    // html canvas for drawing debug view
    createLayout();

    // start video
    startCamera(setCameraCallBack);

    // // load holistic
    loadHolistic(onWorkerResults, function(){
        console.log("holistic model connected");
    });

    // load vrm model
    loadVRM(getCMV('MODEL'));

    console.log("controller initialized");
}

function radLimit(rad){
    let limit = Math.PI / 2;
    return Math.max(-limit, Math.min(limit, rad));
}

function ratioLimit(ratio){
    return Math.max(0, Math.min(1, ratio));
}

function updateMouthEyes(keys){
    if(currentVrm && mood != Tvrmsbspn.Happy && mood != "Extra"){
        let Cbsp = currentVrm.expressionManager;
        let Ch = currentVrm.humanoid;
        // mouth
        let mouthRatio = ratioLimit((keys['mouth'] - getCMV("MOUTH_OPEN_OFFSET")) * getCMV('MOUTH_RATIO'));
        Cbsp.setValue(Tvrmsbspn.Aa, mouthRatio);
        // eyes
        let leo = keys['leftEyeOpen'];
        let reo = keys['rightEyeOpen'];
        if(getCMV("EYE_SYNC") || Math.abs(reo - leo) < getCMV('EYE_LINK_THRESHOLD')){
            let avgEye = (reo + leo) / 2;
            leo = avgEye;
            reo = avgEye;
        }
        if(reo < getCMV('RIGHT_EYE_CLOSE_THRESHOLD')){
            Cbsp.setValue(Tvrmsbspn.BlinkRight, 1);
        }else if(reo < getCMV('RIGHT_EYE_OPEN_THRESHOLD')){
            let eRatio = (reo - getCMV('RIGHT_EYE_CLOSE_THRESHOLD')) / (getCMV('RIGHT_EYE_OPEN_THRESHOLD') - getCMV('RIGHT_EYE_CLOSE_THRESHOLD'));
            Cbsp.setValue(Tvrmsbspn.BlinkRight, ratioLimit((1 - eRatio) * getCMV('RIGHT_EYE_SQUINT_RATIO')));
        }else{
            Cbsp.setValue(Tvrmsbspn.BlinkRight, 0);
        }
        if(leo < getCMV('LEFT_EYE_CLOSE_THRESHOLD')){
            Cbsp.setValue(Tvrmsbspn.BlinkLeft, 1);
        }else if(leo < getCMV('LEFT_EYE_OPEN_THRESHOLD')){
            let eRatio = (leo - getCMV('LEFT_EYE_CLOSE_THRESHOLD')) / (getCMV('LEFT_EYE_OPEN_THRESHOLD') - getCMV('LEFT_EYE_CLOSE_THRESHOLD'));
            Cbsp.setValue(Tvrmsbspn.BlinkLeft, ratioLimit((1 - eRatio) * getCMV('LEFT_EYE_SQUINT_RATIO')));
        }else{
            Cbsp.setValue(Tvrmsbspn.BlinkLeft, 0);
        }
        // irises
        let irispos = keys['irisPos'];
        let irisY = (irispos - getCMV('IRIS_POS_OFFSET')) * getCMV('IRIS_POS_RATIO');
        let riris = Ch.getNormalizedBoneNode(Tvrmshbn.RightEye).rotation;
        let liris = Ch.getNormalizedBoneNode(Tvrmshbn.LeftEye).rotation;
        riris.y = irisY;
        liris.y = irisY;
        // eyebrows
        if(checkVRMMood("Brows up")){
            let browspos = Math.min(1, Math.max(0, keys['brows'] - getCMV("BROWS_OFFSET")) * getCMV("BROWS_RATIO"));
            Cbsp.setValue("Brows up", browspos);
        }
        // auto mood
        if(mood == "AUTO_MOOD_DETECTION"){
            let autoV = Math.max(-1, Math.min(1, keys["auto"] * getCMV("MOOD_AUTO_RATIO")));
            let absauto = Math.max(0, Math.abs(autoV) - getCMV("MOOD_AUTO_OFFSET"));
            let balFun = 0;
            let balSor = 0;
            let balAng = 0;
            if(!checkVRMMood("Brows up")){
                let browspos = Math.min(1, Math.max(0, keys['brows'] - getCMV("BROWS_OFFSET")) * getCMV("BROWS_RATIO"));
                let browslimit = 0.1;
                balFun = Math.min(browslimit, Math.max(0, browspos));
                balSor = Math.min(browslimit / 2, Math.max(0, (browslimit - balFun) / 2));
                balAng = Math.min(browslimit / 2, Math.max(0, (browslimit - balFun) / 2));
            }
            if(autoV < 0){
                Cbsp.setValue(Tvrmsbspn.Angry, balAng);
                Cbsp.setValue(Tvrmsbspn.Sad, absauto + balSor);
                Cbsp.setValue(Tvrmsbspn.Happy, balFun);
                Cbsp.setValue(Tvrmsbspn.Ee, 0);
            }else{
                Cbsp.setValue(Tvrmsbspn.Angry, balAng);
                Cbsp.setValue(Tvrmsbspn.Sad, balSor);
                Cbsp.setValue(Tvrmsbspn.Happy, absauto + balFun);
                Cbsp.setValue(Tvrmsbspn.Ee, absauto);
            }
        }
    }
}

//========================================================================================
//본별 회전값 전달 
function updateBody(keys){

    // console.log("*********************************************")
    // console.log(keys);

    let updateTime = new Date().getTime();
    if(currentVrm){
        let Ch = currentVrm.humanoid;
        let tiltRatio = Math.min(0.2, Math.max(-0.2, keys['tilt']));
        let leanRatio = Math.min(1, Math.max(-1, keys['lean'])) * 0.6;
        // head
        let head = Ch.getNormalizedBoneNode(Tvrmshbn.Head).rotation;
        head.set(radLimit(keys['pitch'] * getCMV('HEAD_RATIO')),
            radLimit(keys['yaw'] * getCMV('HEAD_RATIO') - leanRatio * 0.3),
            radLimit(keys['roll'] * getCMV('HEAD_RATIO') - tiltRatio * 0.3));
        // neck
        let neck = Ch.getNormalizedBoneNode(Tvrmshbn.Neck).rotation;
        neck.set(radLimit(keys['pitch'] * getCMV('NECK_RATIO')),
            radLimit(keys['yaw'] * getCMV('NECK_RATIO') - leanRatio * 0.7),
            radLimit(keys['roll'] * getCMV('NECK_RATIO') - tiltRatio * 0.7));
        // chest
        let chest = Ch.getNormalizedBoneNode(Tvrmshbn.Spine).rotation;
        chest.set(radLimit(keys['pitch'] * getCMV('CHEST_RATIO')),
            radLimit(keys['yaw'] * getCMV('CHEST_RATIO') + leanRatio),
            radLimit(keys['roll'] * getCMV('CHEST_RATIO') + tiltRatio));


        //결과물 출력 (몸) 
        // console.log("======================<head/neck/chest rotation result>========================")
        // console.log("head:");
        // console.log(head);
        // console.log("neck:");
        // console.log(neck);
        // console.log("chest:");
        // console.log(chest);

        console.log("======================<shoulder rotation result>========================")
        //console.log(Tvrmshbn);

        console.log(keys['leftShoulder_pitch']); 
        console.log(keys['leftShoulder_yaw']); 
        console.log(keys['leftShoulder_roll']); 
        // console.log(getCMV('SHOULDER_RATIO')); 


        //각 본별 yaw, pitch, roll 확인 
        /*
        internal_counter = internal_counter + 0.01;

        let left_shoulder = Ch.getNormalizedBoneNode(Tvrmshbn.LeftShoulder).rotation;
        left_shoulder.set(0.0, 0.0, internal_counter);

        let Left_LowerArm = Ch.getNormalizedBoneNode(Tvrmshbn.LeftLowerArm).rotation;
        Left_LowerArm.set(0.0, 0.0, 0.0);

        let Left_Hand = Ch.getNormalizedBoneNode(Tvrmshbn.LeftHand).rotation;
        Left_Hand.set(0.0, 0.0, 0.0);
        */

        //어깨 
        let left_shoulder = Ch.getNormalizedBoneNode(Tvrmshbn.LeftShoulder).rotation;
        left_shoulder.set(radLimit(keys['leftShoulder_pitch']), radLimit(keys['leftShoulder_yaw']), radLimit(keys['leftShoulder_roll']));


        // left_shoulder.set(radLimit(keys['leftShoulder_pitch'] * getCMV('SHOULDER_RATIO')),
        //     radLimit(keys['leftShoulder_yaw'] * getCMV('SHOULDER_RATIO')),
        //     radLimit(keys['leftShoulder_roll'] * getCMV('SHOULDER_RATIO')));
        


        //아래와 같이 하면 들어온다.     
        // console.log("*********************inside************************")
        // console.log(keys['test'])



        // left_shoulder.set(radLimit(keys['leftShoulder_pitch'] * getCMV('SHOULDER_RATIO')),
        //     radLimit(keys['leftShoulder_yaw'] * getCMV('SHOULDER_RATIO')),
        //     radLimit(keys['leftShoulder_roll'] * getCMV('SHOULDER_RATIO')));



        //여기에 오일러 앵글 기반 shoulder, elbow, wrist 값을 추가 
        /*
        //어깨 
        let left_shoulder = Ch.getNormalizedBoneNode(Tvrmshbn.LeftShoulder).rotation;
        left_shoulder.set(radLimit(keys['leftShoulder_pitch'] * getCMV('SHOULDER_RATIO')),
            radLimit(keys['leftShoulder_yaw'] * getCMV('SHOULDER_RATIO') + leanRatio),
            radLimit(keys['leftShoulder_roll'] * getCMV('SHOULDER_RATIO') + tiltRatio));
        
        let right_shoulder = Ch.getNormalizedBoneNode(Tvrmshbn.RightShoulder).rotation;
        right_shoulder.set(radLimit(keys['rightShoulder_pitch'] * getCMV('SHOULDER_RATIO')),
            radLimit(keys['rightShoulder_yaw'] * getCMV('SHOULDER_RATIO') + leanRatio),
            radLimit(keys['rightShoulder_roll'] * getCMV('SHOULDER_RATIO') + tiltRatio));

        //팔꿈치 
        let Left_LowerArm = Ch.getNormalizedBoneNode(Tvrmshbn.LeftLowerArm).rotation;
        Left_LowerArm.set(radLimit(keys['LeftLowerArm_pitch'] * getCMV('LOWERARM_RATIO')),
            radLimit(keys['LeftLowerArm_yaw'] * getCMV('LOWERARM_RATIO') + leanRatio),
            radLimit(keys['LeftLowerArm_roll'] * getCMV('LOWERARM_RATIO') + tiltRatio));
        
        let Right_LowerArm = Ch.getNormalizedBoneNode(Tvrmshbn.RightLowerArm).rotation;
        Right_LowerArm.set(radLimit(keys['RightLowerArm_pitch'] * getCMV('LOWERARM_RATIO')),
            radLimit(keys['RightLowerArm_yaw'] * getCMV('LOWERARM_RATIO') + leanRatio),
            radLimit(keys['RightLowerArm_roll'] * getCMV('LOWERARM_RATIO') + tiltRatio));

        //손
        let Left_Hand = Ch.getNormalizedBoneNode(Tvrmshbn.LeftHand).rotation;
        Left_Hand.set(radLimit(keys['LeftHand_pitch'] * getCMV('HAND_RATIO')),
            radLimit(keys['LeftHand_yaw'] * getCMV('HAND_RATIO') + leanRatio),
            radLimit(keys['LeftHand_roll'] * getCMV('HAND_RATIO') + tiltRatio));
        
        let Right_Hand = Ch.getNormalizedBoneNode(Tvrmshbn.RightHand).rotation;
        Right_Hand.set(radLimit(keys['RightHand_pitch'] * getCMV('HAND_RATIO')),
            radLimit(keys['RightHand_yaw'] * getCMV('HAND_RATIO') + leanRatio),
            radLimit(keys['RightHand_roll'] * getCMV('HAND_RATIO') + tiltRatio));

        */      


        //결과물 출력 (손)
        //아래 껄 사용하지 않고, 
        /*
        console.log("=========<arm rotation result>=======")
        // left right arm
        if(getCMV('HAND_TRACKING')){
            for(let i = 0; i < 2; i ++){
                if(updateTime - handTrackers[i] < 1000 * getCMV('HAND_CHECK')){
                    let prefix = ["left", "right"][i];
                    // upperArm, lowerArm
                    let wx = keys[prefix + "WristX"];
                    let wy = keys[prefix + "WristY"];
                    let hy = keys[prefix + 'Yaw'];
                    let hr = keys[prefix + 'Roll'];
                    let hp = keys[prefix + 'Pitch'];
                    let armEuler = armMagicEuler(wx, wy, hy, hr, hp, i);
                    Object.keys(armEuler).forEach(function(armkey){
                        let armobj = Ch.getNormalizedBoneNode(prefix + armkey).rotation;
                        armobj.copy(armEuler[armkey]);
                        
                        //손 출력
                        console.log(armEuler[armkey]);

                    });
                }else{
                    setDefaultHand(currentVrm, i);
                }
            }
        }else{
            setDefaultPose(currentVrm);
        }
        */
        //=====================================================================

    }
    //======================================================================================
    //위에 코드 대신 Shoulder, Elbow, Hand 총 6개의 각도를 VRM roation 값으로 직접 입력
    //총 6개의 계산해야 할 듯. LeftHand, LeftLowerArm, LeftShoulder, RightHand, RightLowerArm, RightShoulder

    console.log("+++++++++++++++++++++++++++++++++++++"); 
    console.log(Tvrmshbn);

    /*
    // LeftHand
    let LeftHand = Ch.getNormalizedBoneNode(Tvrmshbn.LeftHand).rotation;
    LeftHand.set(radLimit(keys['LeftHand_pitch'] * getCMV('LEFTHAND_RATIO')),
        radLimit(keys['LeftHand_yaw'] * getCMV('LEFTHAND_RATIO') - leanRatio * 0.3),
        radLimit(keys['LeftHand_roll'] * getCMV('LEFTHAND_RATIO') - tiltRatio * 0.3));

    ......

    */

    // keys['LeftHand_pitch'], keys['LeftHand_yaw'], keys['LeftHand_roll']
    // 위의 3개 값은 landmark/posekey.js에서 계산 
    //get CMV 값들은 config-manager.js에서 정의 
    //LeanRatio, tiltRatio는 없어도 될 듯(?)
    


    //=======================================================================================


}

function updatePosition(keys){
    if(currentVrm && defaultXYZ){
        let Ch = currentVrm.humanoid;
        let hips = Ch.getNormalizedBoneNode(Tvrmshbn.Hips).position;
        hips.x = defaultXYZ[0] - keys['x'] * getCMV("POSITION_X_RATIO");
        hips.y = defaultXYZ[1] - keys['y'] * getCMV("POSITION_Y_RATIO");
        hips.z = defaultXYZ[2] + keys['z'] * getCMV("POSITION_Z_RATIO");
    }
}

function updateBreath(){
    if(currentVrm){
        let Ch = currentVrm.humanoid;
        // breath offset
        let bos = getCMV("BREATH_STRENGTH") / 100 * Math.sin(clock.elapsedTime * Math.PI * getCMV('BREATH_FREQUENCY'));
        if(isNaN(bos)){
            bos = 0.0;
        }
        // hips
        let hips = Ch.getNormalizedBoneNode(Tvrmshbn.Hips).position;
        hips.y += bos;
    }
}

function updateMood(){
    if(mood != oldmood){
        console.log(mood, oldmood);
        let Cbsp = currentVrm.expressionManager;
        if(oldmood != "AUTO_MOOD_DETECTION"){
            Cbsp.setValue(oldmood, 0);
        }else{
            Cbsp.setValue(Tvrmsbspn.Angry, 0);
            Cbsp.setValue(Tvrmsbspn.Sad, 0);
            Cbsp.setValue(Tvrmsbspn.Happy, 0);
            Cbsp.setValue(Tvrmsbspn.Ee, 0);
        }
        if(mood != "AUTO_MOOD_DETECTION"){
            Cbsp.setValue(mood, 1);
        }
        oldmood = mood;
    }
}

function updateInfo(){
    let info = getInfo();
    
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    console.log(info); 

    updateBody(info);
    updatePosition(info);
    updateBreath();
    updateMood();
}

// Mood
let defaultMoodList = ['angry', 'sorrow', 'fun', 'joy', 'surprised', 'relaxed', 'neutral', 'auto'];
let moodMap = {
    "angry": Tvrmsbspn.Angry,
    "sorrow": Tvrmsbspn.Sad,
    "fun": Tvrmsbspn.Happy,
    "surprised": "Surprised",
    "relaxed": Tvrmsbspn.Relaxed,
    "neutral": Tvrmsbspn.Neutral,
    "auto": "AUTO_MOOD_DETECTION"
};
let mood = Tvrmsbspn.Neutral;
let oldmood = Tvrmsbspn.Neutral;
function getAllMoods(){
    let validmoods = [];
    Object.keys(moodMap).forEach(function(key){
        if(defaultMoodList.includes(key)){
            if(getCMV("MOOD_" + key.toUpperCase())){
                validmoods.push(key);
            }
        }
    });
    Object.keys(moodMap).forEach(function(key){
        if(!defaultMoodList.includes(key)){
            validmoods.push(key);
        }
    });
    return validmoods;
}
function getMood(){
    return mood;
}
function setMood(newmood){
    oldmood = mood;
    mood = moodMap[newmood];
}

// face landmark resolver
function onFaceLandmarkResult(keyPoints, faceInfo){
    if(faceInfo){
        Object.keys(faceInfo).forEach(function(key){
            let sr = getSR(getKeyType(key)) / getCMV("SENSITIVITY_SCALE");
            tmpInfo[key] = (1-sr) * faceInfo[key] + sr * tmpInfo[key];
        });
        updateMouthEyes(tmpInfo);
    }
}

// pose landmark resolver
function onPoseLandmarkResult(keyPoints, poseInfo){
    if(poseInfo){
        Object.keys(poseInfo).forEach(function(key){
            let sr = getSR(getKeyType(key)) / getCMV("SENSITIVITY_SCALE");
            tmpInfo[key] = (1-sr) * poseInfo[key] + sr * tmpInfo[key];
        });
    }
}

// hand landmark resolver
let fingerRates = {"Thumb": 0.8, "Index": 0.7, "Middle": 0.7, "Ring": 0.7, "Little": 0.6};
let spreadRates = {"Index": -30, "Middle": -10, "Ring": 10, "Little": 30};
let fingerSegs = ["Distal", "Intermediate", "Proximal"];
let thumbSegs = ["Distal", "Metacarpal", "Proximal"];
let thumbRatios = [40, 60, 20];
let thumbSwing = 20;
let handTrackers = [new Date().getTime(), new Date().getTime()];
function onHandLandmarkResult(keyPoints, handInfo, leftright){
    let prefix = ["left", "right"][leftright];
    let preRate = 1 - leftright * 2;
    if(handInfo){
        handTrackers[leftright] = new Date().getTime();
        Object.keys(handInfo).forEach(function(key){
            let sr = getSR('hand') / getCMV("SENSITIVITY_SCALE");
            if(key in tmpInfo){
                tmpInfo[key] = (1-sr) * handInfo[key] + sr * tmpInfo[key];
            }
        });
        let Ch = currentVrm.humanoid;
        Object.keys(fingerRates).forEach(function(finger){
            let fingerRate = fingerRates[finger] * getCMV("FINGER_GRIP_RATIO");
            let spreadRate = spreadRates[finger] * getCMV("FINGER_SPREAD_RATIO");
            let preRatio = tmpInfo[prefix + finger];
            let _ratio = 1 - Math.max(0, Math.min(fingerRate, preRatio)) / fingerRate;
            let preSpread = tmpInfo[prefix + "Spread"];
            if(preRatio < 0){
                preSpread = 0.1;
            }
            let _spread = Math.min(1, Math.max(-0.2, preSpread - 0.1)) * spreadRate;
            if(finger == "Thumb"){
                for(let i = 0; i < thumbSegs.length; i ++){
                    let seg = thumbSegs[i];
                    let ratio = preRate * _ratio * thumbRatios[i] / 180 * Math.PI;
                    let swing = preRate * (0.5 - Math.abs(0.5 - _ratio)) * thumbSwing / 180 * Math.PI;
                    let frotate = Ch.getNormalizedBoneNode(prefix + finger + seg).rotation;
                    frotate.set(0, ratio, swing);
                }
            }else{
                let ratio = preRate * _ratio * 70 / 180 * Math.PI;
                let spread = preRate * _spread / 180 * Math.PI;
                for(seg of fingerSegs){
                    let frotate = Ch.getNormalizedBoneNode(prefix + finger + seg).rotation;
                    if(seg == "Proximal"){
                        frotate.set(0, spread, ratio);
                    }else{
                        frotate.set(0, 0, ratio);
                    }
                }
            }
        });
    }
}
function noHandLandmarkResult(leftright){
    let prefix = ["left", "right"][leftright];
    let tmpHandInfo = getDefaultHandInto(leftright);
    Object.keys(tmpHandInfo).forEach(function(key){
        let sr = getSR(getKeyType(key));
        if(key in tmpInfo){
            tmpInfo[key] = (1-sr) * tmpHandInfo[key] + sr * tmpInfo[key];
        }
    });
    let Ch = currentVrm.humanoid;
    Object.keys(fingerRates).forEach(function(finger){
        if(finger == "Thumb"){
            for(seg of thumbSegs){
                let frotate = Ch.getNormalizedBoneNode(prefix + finger + seg).rotation;
                frotate.set(frotate.x * 0.8, frotate.y * 0.8, frotate.z * 0.8);
            }
        }else{
            for(seg of fingerSegs){
                let frotate = Ch.getNormalizedBoneNode(prefix + finger + seg).rotation;
                frotate.set(frotate.x * 0.8, frotate.y * 0.8, frotate.z * 0.8);
            }
        }
    });
}

// obtain Holistic Result
let firstTime = true;
let tmpInfo = getDefaultInfo();
let mlLoopCounter = 0;
async function onWorkerResults(e){
    if(e.data){
        mlLoopCounter += 1;
        onHolisticResults(e.data);
    }
    getHolisticModel().postMessage(getCaptureImage());
}

async function onHolisticResults(results){
    let updateTime = new Date().getTime();
    if(firstTime){
        hideLoadbox();
        setInterval(checkFPS, 1000 * getCMV("FPS_RATE"));
        console.log("ml & visual loops validated");
        console.log("1st Result: ", results);
    }

    clearDebugCvs();
    if(getCMV('DEBUG_IMAGE')){
        drawImage(getCameraFrame());
    }

    let PoI = {};
    let allInfo = {};
    if(results.faceLandmarks){
        let keyPoints = packFaceHolistic(results.faceLandmarks);
        mergePoints(PoI, keyPoints);
        let faceInfo = face2Info(keyPoints);
        allInfo["face"] = faceInfo;
        onFaceLandmarkResult(keyPoints, faceInfo);
    }
    if(results.poseLandmarks){
        let keyPoints = packPoseHolistic(results.poseLandmarks);
        mergePoints(PoI, keyPoints);
        let poseInfo = pose2Info(keyPoints);
        allInfo["pose"] = poseInfo;
        onPoseLandmarkResult(keyPoints, poseInfo);
    }
    if(results.leftHandLandmarks){
        let keyPoints = packHandHolistic(results.leftHandLandmarks, 0);
        mergePoints(PoI, keyPoints);
        let handInfo = hand2Info(keyPoints, 0);
        allInfo["left_hand"] = handInfo;
        onHandLandmarkResult(keyPoints, handInfo, 0);
    }else if(updateTime - handTrackers[0] > 1000 * getCMV('HAND_CHECK')){
        noHandLandmarkResult(0);
    }
    if(results.rightHandLandmarks){
        let keyPoints = packHandHolistic(results.rightHandLandmarks, 1);
        mergePoints(PoI, keyPoints);
        let handInfo = hand2Info(keyPoints, 1);
        allInfo["right_hand"] = handInfo;
        onHandLandmarkResult(keyPoints, handInfo, 1);
    }else if(updateTime - handTrackers[1] > 1000 * getCMV('HAND_CHECK')){
        noHandLandmarkResult(1);
    }

    printLog(allInfo);
    if(getCMV('DEBUG_LANDMARK')){
        drawLandmark(PoI);
    }
    if(results.faceLandmarks){
        pushInfo(tmpInfo);
    }
    firstTime = false;
}

// the main visualization loop
let viLoopCounter = 0;
async function viLoop(){
    let minVIDura = getCMV("MIN_VI_DURATION");
    let maxVIDura = getCMV("MAX_VI_DURATION");
    if(currentVrm && checkImage()){
        viLoopCounter += 1;
        currentVrm.update(clock.getDelta());
        updateInfo();
        drawScene(scene);
        setTimeout(function(){
            requestAnimationFrame(viLoop);
        }, minVIDura);
    }else{
        setTimeout(function(){
            requestAnimationFrame(viLoop);
        }, maxVIDura);
    }
}

// mood check
let noMoods = [];
function resetVRMMood(){
    noMoods = [];
    Object.keys(moodMap).forEach(function(i){
        if(!(defaultMoodList.includes(i))){
            delete moodMap[i];
        }
    });
    if(currentVrm){
        let defaultMoodLength = Object.keys(moodMap).length;
        for(tmood of currentVrm.expressionManager.blinkExpressionNames){
            noMoods.push(tmood);
        }
        for(tmood of currentVrm.expressionManager.lookAtExpressionNames){
            noMoods.push(tmood);
        }
        for(tmood of currentVrm.expressionManager.mouthExpressionNames){
            noMoods.push(tmood);
        }
        let unknownMood = currentVrm.expressionManager._expressionMap;
        Object.keys(unknownMood).forEach(function(newmood){
            if(!noMoods.includes(newmood)){
                let newmoodid = Object.keys(moodMap).length - defaultMoodLength + 1;
                if(!Object.values(moodMap).includes(newmood)){
                    if(newmoodid <= getCMV("MOOD_EXTRA_LIMIT")){
                        moodMap[newmoodid.toString()] = newmood;
                    }
                }
            }
        });
    }
}
function checkVRMMood(mood){
    if(mood == "auto"){
        return true;
    }else if(noMoods.includes(mood)){
        return false;
    }else if(currentVrm){
        let tmood = moodMap[mood];
        if(currentVrm.expressionManager.getExpressionTrackName(tmood)){
            return true;
        }else if(currentVrm.expressionManager.getExpressionTrackName(mood)){
            return true;
        }else{
            noMoods.push(mood);
            return false;
        }
    }else{
        return false;
    }
}

// integration check
async function checkIntegrate(){
    drawLoading("⟳ Integration Validating...");
    getHolisticModel().postMessage(getCaptureImage());
    requestAnimationFrame(viLoop);
    console.log("ml & visual loops initialized");
}

// check VRM model
function checkVRMModel(){
    if(currentVrm){
        return true;
    }else{
        return false;
    }
}

// initialization loop
function initLoop(){
    if(window.mobileCheck()){
        drawMobile();
    }else{
        drawLoading("Initializing");
        if(checkVRMModel() && checkHModel() && checkImage()){
            console.log("start integration validation");
            checkIntegrate();
        }else{
            requestAnimationFrame(initLoop);
        }
    }
}

// validate counter
function prettyNumber(n){
    return Math.floor(n * 1000) / 1000;
}
function checkFPS(){
    console.log("FPS: ",
        prettyNumber(viLoopCounter / getCMV("FPS_RATE")),
        prettyNumber(mlLoopCounter / getCMV("FPS_RATE")));
    viLoopCounter = 0;
    mlLoopCounter = 0;
}
