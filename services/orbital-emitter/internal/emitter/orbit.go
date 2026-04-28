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
		return "LEO"
	case SSO:
		return "SSO"
	case PO:
		return "PO"
	case MEO:
		return "MEO"
	case HEO:
		return "HEO"
	case GEO:
		return "GEO"
	case GTO:
		return "GTO"
	case Molniya:
		return "Molniya"
	case IRNSS:
		return "IRNSS"
	default:
		return "UNKNOWN"
	}
}

func GetOrbit(meanMotion, eccentricity, inclination float64) Orbit {
	// 1. Priorität: Extrem hochelliptische Orbits (HEO / GTO / Molniya)
	if eccentricity > 0.5 {
		return classifyHighEccentricity(meanMotion, inclination)
	}

	// 2. Priorität: Low Earth Orbits (LEO)
	if meanMotion > 11.25 {
		return classifyLEO(inclination)
	}

	// 3. Priorität: Stationäre Orbits (GEO)
	if meanMotion > 0.98 && meanMotion < 1.1 {
		if eccentricity < 0.01 && inclination < 1.0 {
			return GEO
		}
	}

	// 4. Priorität: Medium Earth Orbit (GPS, Galileo etc.)
	if meanMotion >= 1.1 && meanMotion <= 11.25 {
		return MEO
	}

	return UNKNOWN
}

// Hilfsfunktion für hochelliptische Orbits
func classifyHighEccentricity(n, i float64) Orbit {
	// Molniya: Spezifische Inklination + 12h Umlaufzeit (n ~ 2.0)
	if i > 62.0 && i < 65.0 && n > 1.9 && n < 2.1 {
		return Molniya
	}
	// GTO: Wenn die Umlaufzeit nahe 1 Tag liegt (Transfer zu GEO)
	if n > 0.9 && n < 1.1 {
		return GTO
	}
	return HEO
}

// Hilfsfunktion für LEO Sub-Typen
func classifyLEO(i float64) Orbit {
	if i >= 96.0 && i <= 105.0 {
		return SSO
	}
	if i >= 85.0 && i <= 95.0 {
		return PO
	}
	return LEO
}
