package com.depremmesh;

import android.hardware.camera2.CameraManager;
import android.content.Context;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class FlashlightModule extends ReactContextBaseJavaModule {
    private static ReactApplicationContext reactContext;

    FlashlightModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    @Override
    public String getName() {
        return "Flashlight";
    }

    @ReactMethod
    public void turnOn() {
        try {
            CameraManager camManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
            String cameraId = camManager.getCameraIdList()[0];
            camManager.setTorchMode(cameraId, true);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @ReactMethod
    public void turnOff() {
        try {
            CameraManager camManager = (CameraManager) reactContext.getSystemService(Context.CAMERA_SERVICE);
            String cameraId = camManager.getCameraIdList()[0];
            camManager.setTorchMode(cameraId, false);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
