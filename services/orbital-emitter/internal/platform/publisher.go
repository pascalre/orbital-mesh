package platform

import (
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"solace.dev/go/messaging"
	"solace.dev/go/messaging/pkg/solace"
	"solace.dev/go/messaging/pkg/solace/config"
	"solace.dev/go/messaging/pkg/solace/resource"
)

type SolaceClient struct {
	messagingService solace.MessagingService
	directPublisher  solace.DirectMessagePublisher
}

func NewSolaceClient() (*SolaceClient, error) {
	messagingService, err := getMessagingService()
	if err != nil {
		return nil, err
	}
	directPublisher, err := getDirectMessagePublisherFor(messagingService)
	if err != nil {
		_ = messagingService.Disconnect()
		return nil, err
	}
	return &SolaceClient{
		messagingService: messagingService,
		directPublisher:  directPublisher,
	}, nil
}

func getMessagingService() (solace.MessagingService, error) {
	host := os.Getenv("SOLACE_HOST")
	if host == "" {
		return nil, errors.New("SOLACE_HOST is not set")
	}
	vpn := os.Getenv("SOLACE_VPN")

	brokerConfig := config.ServicePropertyMap{
		config.TransportLayerPropertyHost:                host,
		config.ServicePropertyVPNName:                    vpn,
		config.AuthenticationPropertySchemeBasicUserName: os.Getenv("SOLACE_USERNAME"),
		config.AuthenticationPropertySchemeBasicPassword: os.Getenv("SOLACE_PASSWORD"),
	}

	// todo: add certificate validation
	messagingService, err := messaging.NewMessagingServiceBuilder().
		FromConfigurationProvider(brokerConfig).
		WithTransportSecurityStrategy(config.NewTransportSecurityStrategy().WithoutCertificateValidation()).
		// The default is a limited number of reconnect attempts, after which
		// the service is gone for good and every publish fails. Keep trying
		// forever instead, so a broker or network blip heals itself.
		WithReconnectionRetryStrategy(config.RetryStrategyForeverRetry()).
		Build()
	if err != nil {
		return nil, fmt.Errorf("build messaging service: %w", err)
	}

	messagingService.AddServiceInterruptionListener(func(event solace.ServiceEvent) {
		log.Printf("Solace: connection interrupted: %s (cause: %v)", event.GetMessage(), event.GetCause())
	})
	messagingService.AddReconnectionAttemptListener(func(event solace.ServiceEvent) {
		log.Printf("Solace: reconnecting to %s ...", event.GetBrokerURI())
	})
	messagingService.AddReconnectionListener(func(event solace.ServiceEvent) {
		log.Printf("Solace: reconnected to %s", event.GetBrokerURI())
	})

	// Never log the whole configuration: it contains the password.
	log.Printf("Connecting to Solace broker %s (VPN %q)...", host, vpn)
	if err := messagingService.Connect(); err != nil {
		return nil, fmt.Errorf("connect to Solace broker: %w", err)
	}
	return messagingService, nil
}

func getDirectMessagePublisherFor(messagingService solace.MessagingService) (solace.DirectMessagePublisher, error) {
	directPublisher, err := messagingService.CreateDirectMessagePublisherBuilder().Build()
	if err != nil {
		return nil, fmt.Errorf("build direct publisher: %w", err)
	}
	if err := directPublisher.Start(); err != nil {
		return nil, fmt.Errorf("start direct publisher: %w", err)
	}
	return directPublisher, nil
}

// PublishDirectMessage never panics; a failed publish is returned as an error.
func (s *SolaceClient) PublishDirectMessage(topic, messageBody string) error {
	message, err := s.messagingService.MessageBuilder().BuildWithStringPayload(messageBody)
	if err != nil {
		return fmt.Errorf("build message: %w", err)
	}
	if err := s.directPublisher.Publish(message, resource.TopicOf(topic)); err != nil {
		return fmt.Errorf("publish to %s: %w", topic, err)
	}
	return nil
}

// IsConnected reports whether the broker connection is currently up.
func (s *SolaceClient) IsConnected() bool {
	return s.messagingService.IsConnected()
}

// Close flushes and disconnects, giving in-flight messages a short grace period.
func (s *SolaceClient) Close() {
	if err := s.directPublisher.Terminate(5 * time.Second); err != nil {
		log.Printf("Solace: terminating publisher: %v", err)
	}
	if err := s.messagingService.Disconnect(); err != nil {
		log.Printf("Solace: disconnecting: %v", err)
	}
}
