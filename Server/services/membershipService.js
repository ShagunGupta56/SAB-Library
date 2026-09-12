// ==========================================
// APPLY / EXTEND MEMBERSHIP AFTER PAYMENT
// ==========================================

function applyMembershipForPayment(
    connection,
    studentId,
    months,
    callback
) {

    const activeMembershipSql = `
        SELECT *
        FROM memberships

        WHERE student_id = ?
        AND status = 'ACTIVE'
        AND valid_till >= CURRENT_DATE

        ORDER BY id DESC
        LIMIT 1
    `;


    connection.query(
        activeMembershipSql,
        [studentId],
        (err, memberships) => {

            if (err) {
                return callback(err);
            }


            // ==================================
            // EXISTING ACTIVE MEMBERSHIP
            // Extend current validity
            // ==================================

            if (memberships.length > 0) {

                const membership =
                    memberships[0];


                const updateSql = `
                    UPDATE memberships

                    SET
                        valid_till =
                            DATE_ADD(
                                valid_till,
                                INTERVAL ? MONTH
                            ),
                    WHERE id = ?
                `;


                connection.query(
                    updateSql,
                    [
                        Number(months),
                        membership.id
                    ],
                    (err) => {

                        if (err) {
                            return callback(err);
                        }


                        callback(
                            null,
                            {
                                type: "EXTENDED",
                                membershipId:
                                    membership.id
                            }
                        );
                    }
                );

                return;
            }


            // ==================================
            // NO ACTIVE MEMBERSHIP
            // Expire old records first
            // ==================================

            const expireSql = `
                UPDATE memberships

                SET status = 'EXPIRED'

                WHERE student_id = ?
                AND status = 'ACTIVE'
                AND valid_till < CURRENT_DATE
            `;


            connection.query(
                expireSql,
                [studentId],
                (err) => {

                    if (err) {
                        return callback(err);
                    }


                    const plan =
                        `${Number(months)} Month`;


                    const createSql = `
                        INSERT INTO memberships
                        (
                            student_id,
                            plan,
                            valid_from,
                            valid_till,
                            status
                        )

                        VALUES
                        (
                            ?,
                            ?,
                            CURRENT_DATE,

                            DATE_ADD(
                                CURRENT_DATE,
                                INTERVAL ? MONTH
                            ),

                            'ACTIVE'
                        )
                    `;


                    connection.query(
                        createSql,
                        [
                            studentId,
                            plan,
                            Number(months)
                        ],
                        (err, result) => {

                            if (err) {
                                return callback(err);
                            }


                            callback(
                                null,
                                {
                                    type: "CREATED",
                                    membershipId:
                                        result.insertId
                                }
                            );
                        }
                    );
                }
            );
        }
    );
}


module.exports = {
    applyMembershipForPayment
};