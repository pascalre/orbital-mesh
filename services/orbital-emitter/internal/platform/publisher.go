package platform

import (
	"log"
	"os"

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
	messagingService := getMessagingService()
	directPublisher := getDirectMessagePublisherFor(messagingService)
	return &SolaceClient{
		messagingService: messagingService,
		directPublisher:  directPublisher,
	}, nil
}

func getMessagingService() solace.MessagingService {
	brokerConfig := config.ServicePropertyMap{
		config.TransportLayerPropertyHost:                os.Getenv("SOLACE_HOST"),
		config.ServicePropertyVPNName:                    os.Getenv("SOLACE_VPN"),
		config.AuthenticationPropertySchemeBasicUserName: os.Getenv("SOLACE_USERNAME"),
		config.AuthenticationPropertySchemeBasicPassword: os.Getenv("SOLACE_PASSWORD"),
	}

	// todo: add certificate validation
	messagingService, err := messaging.NewMessagingServiceBuilder().
		FromConfigurationProvider(brokerConfig).
		WithTransportSecurityStrategy(config.NewTransportSecurityStrategy().WithoutCertificateValidation()).
		Build()

	if err != nil {
		panic(err)
	}

	log.Printf("Connecting to Solace Broker at %s...\n", brokerConfig.GetConfiguration().String())

	if err := messagingService.Connect(); err != nil {
		panic(err)
	}
	return messagingService
}

func getDirectMessagePublisherFor(messagingService solace.MessagingService) solace.DirectMessagePublisher {
	directPublisher, builderErr := messagingService.CreateDirectMessagePublisherBuilder().Build()
	if builderErr != nil {
		panic(builderErr)
	}

	startErr := directPublisher.Start()
	if startErr != nil {
		panic(startErr)
	}
	return directPublisher
}

func (s *SolaceClient) PublishDirectMessage(topic string, messageBody string) {
	messageBuilder := s.messagingService.MessageBuilder()
	message, err := messageBuilder.BuildWithStringPayload(messageBody)
	if err != nil {
		panic(err)
	}

	publishErr := s.directPublisher.Publish(message, resource.TopicOf(topic))
	if publishErr != nil {
		panic(publishErr)
	}

	log.Printf("Published message to topic: %s", topic)
}
