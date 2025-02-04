import { Switch, Route } from "wouter";
import { SubscriptionSuccess } from "./components/SubscriptionSuccess";
import { SubscriptionCanceled } from "./components/SubscriptionCanceled";
import { Toaster } from "./components/Toaster";

// ... rest of the imports

function App() {
  // ... existing code

  return (
    <>
      <Switch>
        {/* Add subscription result routes */}
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/subscription/canceled" component={SubscriptionCanceled} />
        {/* ... other existing routes */}
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
