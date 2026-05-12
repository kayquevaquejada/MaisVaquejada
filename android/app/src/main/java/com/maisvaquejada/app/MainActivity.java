package com.maisvaquejada.app;

import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Forward the intent to Capacitor so the JS side can handle the OAuth redirect
        this.handleIntent(intent);
    }
}



