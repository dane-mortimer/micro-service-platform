package main.java.com.example.userservice;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    @GetMapping("/settings")
    public UserSettings getSettings(@RequestParam String user_id) {
        // Simulate fetching user settings from a database
        UserSettings settings = new UserSettings();
        settings.setFilterRated(true); // Example: User wants to filter R-rated movies
        return settings;
    }
}