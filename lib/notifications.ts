import { createClient } from "@/lib/supabase/client"

interface NotificationData {
  user_id: string
  establishment_id: string
  type: string
  title: string
  message: string
  sub_room_id?: string
  proposal_id?: string
  triggered_by?: string
}

export async function sendNotification(data: NotificationData) {
  console.log("[v0] Sending notification:", data)

  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[v0] Error sending notification via API:", error)
      return
    }

    const result = await response.json()
    console.log("[v0] Notification sent successfully:", result.data.id)
  } catch (error) {
    console.error("[v0] Error sending notification:", error)
  }
}

export async function notifyPlanModified(
  subRoomId: string,
  subRoomName: string,
  classIds: string[],
  establishmentId: string,
) {
  const supabase = createClient()

  const { data: students, error } = await supabase
    .from("students")
    .select("profile_id")
    .in("class_id", classIds)
    .not("profile_id", "is", null)

  if (error || !students) {
    console.error("[v0] Error fetching students:", error)
    return
  }

  for (const student of students) {
    await sendNotification({
      user_id: student.profile_id!,
      establishment_id: establishmentId,
      type: "plan_modified",
      title: "Plan de classe modifié",
      message: `Le plan "${subRoomName}" a été mis à jour`,
      sub_room_id: subRoomId,
    })
  }
}

export async function notifyProposalStatusChange(
  proposalId: string,
  delegateUserId: string,
  status: "approved" | "rejected" | "returned",
  subRoomName: string,
  establishmentId: string,
  rejectionReason?: string,
) {
  if (status === "approved") {
    await sendNotification({
      user_id: delegateUserId,
      establishment_id: establishmentId,
      type: "plan_validated",
      title: "Proposition validée",
      message: `Votre proposition "${subRoomName}" a été validée et est maintenant active`,
      proposal_id: proposalId,
    })
  } else if (status === "rejected") {
    await sendNotification({
      user_id: delegateUserId,
      establishment_id: establishmentId,
      type: "plan_rejected",
      title: "Proposition refusée",
      message: rejectionReason || `Votre proposition "${subRoomName}" a été refusée`,
      proposal_id: proposalId,
    })
  } else if (status === "returned") {
    await sendNotification({
      user_id: delegateUserId,
      establishment_id: establishmentId,
      type: "plan_returned",
      title: "Proposition à revoir",
      message: rejectionReason || `Le professeur demande des modifications pour "${subRoomName}"`,
      proposal_id: proposalId,
    })
  }
}

export async function notifyPlanCreated(
  subRoomId: string,
  subRoomName: string,
  classIds: string[],
  establishmentId: string,
) {
  const supabase = createClient()

  const { data: students, error } = await supabase
    .from("students")
    .select("profile_id")
    .in("class_id", classIds)
    .not("profile_id", "is", null)

  if (error || !students) {
    console.error("[v0] Error fetching students:", error)
    return
  }

  for (const student of students) {
    await sendNotification({
      user_id: student.profile_id!,
      establishment_id: establishmentId,
      type: "plan_created",
      title: "Nouveau plan de classe",
      message: `Un nouveau plan "${subRoomName}" a été créé pour votre classe`,
      sub_room_id: subRoomId,
    })
  }
}

export async function notifyPlanDeleted(subRoomName: string, classIds: string[], establishmentId: string) {
  const supabase = createClient()

  const { data: students, error } = await supabase
    .from("students")
    .select("profile_id")
    .in("class_id", classIds)
    .not("profile_id", "is", null)

  if (error || !students) {
    console.error("[v0] Error fetching students:", error)
    return
  }

  for (const student of students) {
    await sendNotification({
      user_id: student.profile_id!,
      establishment_id: establishmentId,
      type: "plan_deleted",
      title: "Plan de classe supprimé",
      message: `Le plan "${subRoomName}" a été supprimé`,
    })
  }
}

export async function notifyProposalSubmitted(
  proposalId: string,
  teacherUserId: string,
  subRoomName: string,
  delegateName: string,
  establishmentId: string,
) {
  await sendNotification({
    user_id: teacherUserId,
    establishment_id: establishmentId,
    type: "proposal_submitted",
    title: "Nouvelle proposition",
    message: `${delegateName} a soumis une proposition pour "${subRoomName}"`,
    proposal_id: proposalId,
  })
}

export async function notifySubRoomCreated(
  subRoomId: string,
  subRoomName: string,
  teacherIds: string[],
  establishmentId: string,
  createdBy: string,
) {
  const supabase = createClient()

  // Get creator name
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", createdBy)
    .single()

  const creatorName = creatorProfile ? `${creatorProfile.first_name} ${creatorProfile.last_name}` : "Un collègue"

  // Notify all teachers associated with the sub-room
  for (const teacherId of teacherIds) {
    if (teacherId !== createdBy) {
      // Don't notify the creator
      const { data: teacherProfile } = await supabase.from("profiles").select("id").eq("id", teacherId).single()

      if (teacherProfile) {
        await sendNotification({
          user_id: teacherId,
          establishment_id: establishmentId,
          type: "sub_room_created",
          title: "Nouvelle sous-salle",
          message: `${creatorName} a créé la sous-salle "${subRoomName}"`,
          sub_room_id: subRoomId,
          triggered_by: createdBy,
        })
      }
    }
  }
}

export async function notifyRoomInvitation(
  roomId: string,
  roomName: string,
  invitedTeacherId: string,
  invitedBy: string,
  establishmentId: string,
) {
  const supabase = createClient()

  // Get inviter name
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", invitedBy)
    .single()

  const inviterName = inviterProfile ? `${inviterProfile.first_name} ${inviterProfile.last_name}` : "Un collègue"

  await sendNotification({
    user_id: invitedTeacherId,
    establishment_id: establishmentId,
    type: "room_invitation",
    title: "Invitation à une salle multi-profs",
    message: `${inviterName} vous invite à rejoindre la salle "${roomName}"`,
    triggered_by: invitedBy,
  })
}
