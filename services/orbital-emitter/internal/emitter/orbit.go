package emitter

type Orbit int64

const (
	LEO     Orbit = iota // Low earth orbit
	SSO                  // Sun-synchronous orbit
	PO                   // Polar orbit
	MEO                  // Medium earth orbit
	HEO                  // Highly eccentric orbit
	GEO                  // Geostationary orbit
	GTO                  // Geostationary transfer orbit
	Molniya              // Molniya orbit
	IRNSS                // Indian Regional Navigation Satellite System
	UNKNOWN              // Fallback
)

func (orbit Orbit) toString() string {
	switch orbit {
	case LEO:
		return "leo"
	case SSO:
		return "sso"
	case PO:
		return "po"
	case MEO:
		return "meo"
	case HEO:
		return "heo"
	case GEO:
		return "geo"
	case GTO:
		return "gto"
	case Molniya:
		return "molniya"
	case IRNSS:
		return "irnss"
	default:
		return "unknown"
	}
}

func GetOrbit(meanMotion, eccentricity, inclination float64) Orbit {
	if eccentricity > 0.5 {
		return classifyHighEccentricity(meanMotion, inclination)
	}

	if meanMotion > 11.25 {
		return classifyLEO(inclination)
	}

	if meanMotion > 0.98 && meanMotion < 1.1 {
		if eccentricity < 0.01 && inclination < 1.0 {
			return GEO
		}
	}

	if meanMotion >= 1.1 && meanMotion <= 11.25 {
		return MEO
	}

	return UNKNOWN
}

func classifyHighEccentricity(n, i float64) Orbit {
	if i > 62.0 && i < 65.0 && n > 1.9 && n < 2.1 {
		return Molniya
	}

	if n > 0.9 && n < 1.1 {
		return GTO
	}
	return HEO
}

func classifyLEO(i float64) Orbit {
	if i >= 96.0 && i <= 105.0 {
		return SSO
	}
	if i >= 85.0 && i <= 95.0 {
		return PO
	}
	return LEO
}
