package com.appifylab.social.service;

import com.appifylab.social.dto.AuthResponse;
import com.appifylab.social.dto.LoginRequest;
import com.appifylab.social.dto.RegisterRequest;
import com.appifylab.social.entity.UserAccount;
import com.appifylab.social.repository.UserAccountRepository;
import com.appifylab.social.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        if (userAccountRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("Email is already in use");
        }

        UserAccount user = new UserAccount();
        user.setFullName(request.fullName().trim());
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setProfilePhotoUrl(UserProfileDefaults.DEFAULT_PROFILE_PHOTO_URL);

        UserAccount savedUser = userAccountRepository.save(user);
        String token = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.withUsername(savedUser.getEmail())
                        .password(savedUser.getPasswordHash())
                        .roles("USER")
                        .build()
        );

        return new AuthResponse(
                token,
                savedUser.getEmail(),
                savedUser.getFullName(),
                UserProfileDefaults.resolveProfilePhotoUrl(savedUser.getProfilePhotoUrl())
        );
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.password())
            );
        } catch (Exception exception) {
            throw new BadCredentialsException("Invalid email or password");
        }

        UserAccount user = userAccountRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        String token = jwtService.generateToken(
                org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                        .password(user.getPasswordHash())
                        .roles("USER")
                        .build()
        );

        return new AuthResponse(
                token,
                user.getEmail(),
                user.getFullName(),
                UserProfileDefaults.resolveProfilePhotoUrl(user.getProfilePhotoUrl())
        );
    }
}
