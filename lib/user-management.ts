import { createClient } from "@/lib/supabase/client"

export interface CreateUserParams {
  establishment_id: string
  role: "vie-scolaire" | "professeur" | "delegue"
  first_name: string
  last_name: string
  email?: string
  phone?: string
  username?: string
  password?: string
  // Pour les élèves
  class_id?: string
  student_role?: "delegue" | "eco-delegue" | null
  // Pour les professeurs
  subject?: string
  class_ids?: string[]
}

export interface UserCredentials {
  username: string
  password: string
  profile_id: string
  role: string
}

/**
 * Génère un nom d'utilisateur unique basé sur le prénom et nom
 */
function generateUsername(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever les accents
    .replace(/[^a-z.]/g, "")

  const random = Math.floor(Math.random() * 1000)
  return `${base}${random}`
}

/**
 * Génère un mot de passe aléatoire
 */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let password = ""
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Crée un utilisateur complet (profile + student/teacher)
 */
export async function createUser(params: CreateUserParams): Promise<UserCredentials> {
  const supabase = createClient()

  console.log("[v0] Creating user with params:", params)

  // 1. Générer username et password si non fournis
  const username = params.username || generateUsername(params.first_name, params.last_name)
  const password = params.password || generatePassword()

  // 2. Hasher le mot de passe côté serveur avec la fonction SQL
  const { data: hashedData, error: hashError } = await supabase.rpc("hash_password", { password })

  if (hashError) {
    console.error("Error hashing password:", hashError)
    throw new Error("Erreur lors du hashage du mot de passe")
  }

  const password_hash = hashedData as string

  // 3. Créer le profil
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .insert({
      establishment_id: params.establishment_id,
      role: params.role,
      username,
      password_hash,
      first_name: params.first_name,
      last_name: params.last_name,
      email: params.email,
      phone: params.phone,
      can_create_subrooms: params.role === "vie-scolaire" || params.role === "professeur",
    })
    .select()
    .single()

  if (profileError) {
    console.error("Error creating profile:", profileError)
    throw new Error("Erreur lors de la création du profil")
  }

  // 4. Créer l'enregistrement spécifique selon le rôle
  if (params.role === "delegue" && params.class_id) {
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("name")
      .eq("id", params.class_id)
      .single()

    if (classError) {
      console.error("[v0] Error fetching class:", classError)
      await supabase.from("profiles").delete().eq("id", profile.id)
      throw new Error("Erreur lors de la récupération de la classe")
    }

    // Créer un élève
    const { error: studentError } = await supabase.from("students").insert({
      profile_id: profile.id,
      establishment_id: params.establishment_id,
      first_name: params.first_name,
      last_name: params.last_name,
      email: params.email,
      phone: params.phone,
      class_id: params.class_id,
      class_name: classData.name, // Add class_name field
      role: params.student_role || "delegue",
      username, // Add username to students table
      password_hash, // Add password_hash to students table
    })

    if (studentError) {
      console.error("[v0] Error creating student:", studentError)
      // Supprimer le profil si la création de l'élève échoue
      await supabase.from("profiles").delete().eq("id", profile.id)
      throw new Error("Erreur lors de la création de l'élève")
    }

    console.log("[v0] Student created successfully")
  } else if (params.role === "professeur") {
    // Créer un professeur
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .insert({
        profile_id: profile.id,
        establishment_id: params.establishment_id,
        first_name: params.first_name,
        last_name: params.last_name,
        email: params.email,
        subject: params.subject || "",
      })
      .select()
      .single()

    if (teacherError) {
      console.error("Error creating teacher:", teacherError)
      await supabase.from("profiles").delete().eq("id", profile.id)
      throw new Error("Erreur lors de la création du professeur")
    }

    // Associer les classes si fournies
    if (params.class_ids && params.class_ids.length > 0 && teacher) {
      const classAssignments = params.class_ids.map((class_id) => ({
        teacher_id: teacher.id,
        class_id,
      }))

      const { error: classError } = await supabase.from("teacher_classes").insert(classAssignments)

      if (classError) {
        console.error("Error assigning classes:", classError)
      }
    }

    console.log("[v0] Teacher created successfully")
  }

  // 5. Enregistrer l'action
  await supabase.from("action_logs").insert({
    user_id: profile.id,
    establishment_id: params.establishment_id,
    action_type: "create",
    entity_type: params.role === "delegue" ? "student" : params.role === "professeur" ? "teacher" : "profile",
    entity_id: profile.id,
    details: { username, role: params.role },
  })

  console.log("[v0] User created successfully:", { username, profile_id: profile.id })

  return {
    username,
    password,
    profile_id: profile.id,
    role: params.role,
  }
}
